import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";

/**
 * 企业微信用户映射服务
 * 管理企业微信用户和系统用户的映射关系
 */
@Injectable()
export class WechatUserMappingService {
  private readonly logger = new Logger(WechatUserMappingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取或创建用户映射
   */
  async getOrCreateMapping(
    wechatUserId: string,
    wechatUserName?: string,
  ): Promise<{
    id: string;
    systemUserId: string | null;
    isActive: boolean;
  }> {
    let mapping = await this.prisma.wechatUserMapping.findUnique({
      where: { wechatUserId },
    });

    if (!mapping) {
      mapping = await this.prisma.wechatUserMapping.create({
        data: {
          wechatUserId,
          wechatUserName,
          isActive: true,
        },
      });
      this.logger.debug(`创建新的企业微信用户映射: ${wechatUserId}`);
    } else if (wechatUserName && mapping.wechatUserName !== wechatUserName) {
      // 更新用户名
      await this.prisma.wechatUserMapping.update({
        where: { wechatUserId },
        data: { wechatUserName },
      });
    }

    return {
      id: mapping.id,
      systemUserId: mapping.systemUserId,
      isActive: mapping.isActive,
    };
  }

  /**
   * 绑定系统用户
   */
  async bindSystemUser(
    wechatUserId: string,
    systemUserId: string,
  ): Promise<void> {
    await this.prisma.wechatUserMapping.update({
      where: { wechatUserId },
      data: { systemUserId },
    });
    this.logger.debug(
      `绑定企业微信用户 ${wechatUserId} 到系统用户 ${systemUserId}`,
    );
  }

  /**
   * 解绑系统用户
   */
  async unbindSystemUser(wechatUserId: string): Promise<void> {
    await this.prisma.wechatUserMapping.update({
      where: { wechatUserId },
      data: { systemUserId: null },
    });
    this.logger.debug(`解绑企业微信用户 ${wechatUserId}`);
  }

  /**
   * 通过手机号自动绑定用户
   */
  async autoBindByPhone(wechatUserId: string, phone: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { phone },
    });

    if (user) {
      await this.bindSystemUser(wechatUserId, user.id);
      return true;
    }

    return false;
  }

  /**
   * 通过邮箱自动绑定用户
   */
  async autoBindByEmail(wechatUserId: string, email: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { email },
    });

    if (user) {
      await this.bindSystemUser(wechatUserId, user.id);
      return true;
    }

    return false;
  }

  /**
   * 获取用户映射列表
   */
  async getMappingList(options: {
    page?: number;
    pageSize?: number;
    isActive?: boolean;
  }): Promise<{
    data: Array<{
      id: string;
      wechatUserId: string;
      wechatUserName: string | null;
      systemUserId: string | null;
      systemUserName: string | null;
      isActive: boolean;
    }>;
    total: number;
  }> {
    const { page = 1, pageSize = 20, isActive } = options;

    const where: Record<string, unknown> = {};
    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [mappings, total] = await Promise.all([
      this.prisma.wechatUserMapping.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.wechatUserMapping.count({ where }),
    ]);

    // 获取系统用户信息
    const userIds = mappings
      .map((m) => m.systemUserId)
      .filter(Boolean) as string[];

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, username: true },
    });

    const userMap = new Map<
      string,
      { id: string; name: string; username: string }
    >(users.map((u) => [u.id, u]));

    const data = mappings.map((m) => ({
      id: m.id,
      wechatUserId: m.wechatUserId,
      wechatUserName: m.wechatUserName,
      systemUserId: m.systemUserId,
      systemUserName: m.systemUserId
        ? userMap.get(m.systemUserId)?.name || null
        : null,
      isActive: m.isActive,
    }));

    return { data, total };
  }

  /**
   * 设置映射状态
   */
  async setMappingStatus(
    wechatUserId: string,
    isActive: boolean,
  ): Promise<void> {
    await this.prisma.wechatUserMapping.update({
      where: { wechatUserId },
      data: { isActive },
    });
  }
}
