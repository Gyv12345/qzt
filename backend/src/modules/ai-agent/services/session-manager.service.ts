import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";

/**
 * 会话状态
 */
export type SessionStatus = "active" | "completed" | "expired";

/**
 * 会话数据
 */
export interface SessionData {
  id: string;
  wechatUserId: string;
  systemUserId?: string;
  intent?: string;
  extractedEntities?: Record<string, unknown>;
  missingFields?: string[];
  status: SessionStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 会话管理服务
 * 管理多轮对话的会话状态
 */
@Injectable()
export class SessionManagerService {
  private readonly logger = new Logger(SessionManagerService.name);

  // 会话超时时间（30分钟）
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建新会话
   */
  async createSession(
    wechatUserId: string,
    systemUserId?: string,
  ): Promise<SessionData> {
    const expiresAt = new Date(Date.now() + this.SESSION_TIMEOUT_MS);

    const session = await this.prisma.agentSession.create({
      data: {
        wechatUserId,
        systemUserId,
        status: "active",
        expiresAt,
      },
    });

    this.logger.debug(`创建新会话: ${session.id}`);
    return this.toSessionData(session);
  }

  /**
   * 获取活跃会话
   */
  async getActiveSession(wechatUserId: string): Promise<SessionData | null> {
    // 先清理过期会话
    await this.cleanExpiredSessions();

    const session = await this.prisma.agentSession.findFirst({
      where: {
        wechatUserId,
        status: "active",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    return session ? this.toSessionData(session) : null;
  }

  /**
   * 获取或创建会话
   */
  async getOrCreateSession(
    wechatUserId: string,
    systemUserId?: string,
  ): Promise<SessionData> {
    const existingSession = await this.getActiveSession(wechatUserId);
    if (existingSession) {
      // 更新过期时间
      await this.updateSessionExpiry(existingSession.id);
      return existingSession;
    }
    return this.createSession(wechatUserId, systemUserId);
  }

  /**
   * 更新会话状态
   */
  async updateSession(
    sessionId: string,
    data: Partial<
      Pick<
        SessionData,
        "intent" | "extractedEntities" | "missingFields" | "status"
      >
    >,
  ): Promise<SessionData> {
    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: new Date(),
    };

    // 将对象转为 JSON 字符串
    if (data.extractedEntities) {
      updateData.extractedEntities = JSON.stringify(data.extractedEntities);
    }
    if (data.missingFields) {
      updateData.missingFields = JSON.stringify(data.missingFields);
    }

    const session = await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    return this.toSessionData(session);
  }

  /**
   * 更新会话过期时间
   */
  async updateSessionExpiry(sessionId: string): Promise<void> {
    const expiresAt = new Date(Date.now() + this.SESSION_TIMEOUT_MS);
    await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: { expiresAt, updatedAt: new Date() },
    });
  }

  /**
   * 完成会话
   */
  async completeSession(sessionId: string): Promise<void> {
    await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: { status: "completed", updatedAt: new Date() },
    });
  }

  /**
   * 清理过期会话
   */
  async cleanExpiredSessions(): Promise<number> {
    const result = await this.prisma.agentSession.updateMany({
      where: {
        status: "active",
        expiresAt: { lt: new Date() },
      },
      data: { status: "expired" },
    });

    if (result.count > 0) {
      this.logger.debug(`清理了 ${result.count} 个过期会话`);
    }

    return result.count;
  }

  /**
   * 绑定系统用户到会话
   */
  async bindSystemUser(
    sessionId: string,
    systemUserId: string,
  ): Promise<SessionData> {
    const session = await this.prisma.agentSession.update({
      where: { id: sessionId },
      data: { systemUserId, updatedAt: new Date() },
    });

    return this.toSessionData(session);
  }

  /**
   * 转换数据库记录为会话数据
   */
  private toSessionData(session: Record<string, unknown>): SessionData {
    return {
      id: session.id as string,
      wechatUserId: session.wechatUserId as string,
      systemUserId: session.systemUserId as string | undefined,
      intent: session.intent as string | undefined,
      extractedEntities: session.extractedEntities
        ? JSON.parse(session.extractedEntities as string)
        : undefined,
      missingFields: session.missingFields
        ? JSON.parse(session.missingFields as string)
        : undefined,
      status: session.status as SessionStatus,
      expiresAt: session.expiresAt as Date,
      createdAt: session.createdAt as Date,
      updatedAt: session.updatedAt as Date,
    };
  }
}
