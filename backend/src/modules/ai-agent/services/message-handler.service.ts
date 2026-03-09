import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../common/prisma/prisma.service";
import { IntentParserService } from "./intent-parser.service";
import { EntityExtractorService } from "./entity-extractor.service";
import { ActionExecutorService } from "./action-executor.service";
import { SessionManagerService, SessionData } from "./session-manager.service";
import { ZhipuProvider } from "../providers/zhipu.provider";
import { AgentResponseDto } from "../dto/wechat-message.dto";

/**
 * 消息处理主服务
 * 协调意图解析、实体提取、操作执行等各个子服务
 */
@Injectable()
export class MessageHandlerService {
  private readonly logger = new Logger(MessageHandlerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly intentParser: IntentParserService,
    private readonly entityExtractor: EntityExtractorService,
    private readonly actionExecutor: ActionExecutorService,
    private readonly sessionManager: SessionManagerService,
    private readonly zhipuProvider: ZhipuProvider,
  ) {}

  /**
   * 处理用户消息
   * @param wechatUserId 企业微信用户ID 或系统用户ID（测试时）
   * @param content 消息内容
   * @param isTestMode 是否为测试模式（直接使用 wechatUserId 作为系统用户ID）
   */
  async handleMessage(
    wechatUserId: string,
    content: string,
    isTestMode = false,
  ): Promise<AgentResponseDto> {
    this.logger.debug(`处理消息: ${content}, 测试模式: ${isTestMode}`);

    try {
      // 1. 获取或创建会话
      const session =
        await this.sessionManager.getOrCreateSession(wechatUserId);

      // 2. 获取系统用户信息（用于权限控制）
      let systemUserId: string | undefined;

      if (isTestMode) {
        // 测试模式：直接使用传入的用户ID
        systemUserId = wechatUserId;
      } else {
        // 正常模式：通过企业微信映射查找
        const userMapping = await this.getUserMapping(wechatUserId);
        systemUserId = userMapping?.systemUserId || session.systemUserId;
      }

      const isAdmin = await this.isUserAdmin(systemUserId);

      // 3. 解析意图
      const intentResult = await this.intentParser.parse(
        content,
        this.buildContext(session),
      );

      // 4. 如果是 unknown 意图，直接返回帮助信息
      if (intentResult.intent === "unknown") {
        return {
          content:
            "抱歉，我没有理解您的意思。您可以尝试说：\n" +
            "• 新建客户\n" +
            "• 添加跟进记录\n" +
            "• 创建合同\n" +
            "• 添加回款\n" +
            "• 查询客户\n" +
            '或发送"帮助"了解更多。',
          intent: "unknown",
        };
      }

      // 5. 提取和合并实体
      let entities = {
        ...session.extractedEntities,
        ...intentResult.entities,
      };
      entities = await this.entityExtractor.extract(
        content,
        intentResult.intent,
        entities,
      );

      // 6. 检查缺失字段
      const missingFields = this.entityExtractor.checkMissingFields(
        intentResult.intent,
        entities,
      );

      // 7. 如果有缺失字段，询问用户
      if (missingFields.length > 0) {
        // 更新会话
        await this.sessionManager.updateSession(session.id, {
          intent: intentResult.intent,
          extractedEntities: entities,
          missingFields,
        });

        const promptMessage =
          this.entityExtractor.generateMissingFieldsMessage(missingFields);

        return {
          content: promptMessage,
          intent: intentResult.intent,
          needMoreInfo: true,
          missingFields,
        };
      }

      // 8. 执行操作
      const result = await this.actionExecutor.execute(
        intentResult.intent,
        entities,
        systemUserId || "system",
        isAdmin,
      );

      // 9. 记录操作日志
      await this.logAction(
        systemUserId || "system",
        intentResult.intent,
        content,
        entities,
        result,
      );

      // 10. 完成会话
      await this.sessionManager.completeSession(session.id);

      // 11. 返回结果
      return {
        content: result.message,
        intent: intentResult.intent,
        needMoreInfo: false,
        result: result.data,
      };
    } catch (error) {
      this.logger.error(`消息处理失败: ${error}`);
      return {
        content: "抱歉，处理您的请求时遇到了问题，请稍后再试。",
        intent: "error",
      };
    }
  }

  /**
   * 获取用户映射
   */
  private async getUserMapping(
    wechatUserId: string,
  ): Promise<{ systemUserId: string } | null> {
    const mapping = await this.prisma.wechatUserMapping.findUnique({
      where: { wechatUserId },
      select: { systemUserId: true },
    });
    return mapping?.systemUserId
      ? { systemUserId: mapping.systemUserId }
      : null;
  }

  /**
   * 检查用户是否是管理员
   */
  private async isUserAdmin(userId?: string): Promise<boolean> {
    if (!userId) return false;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: { include: { role: true } } },
    });

    if (!user) return false;

    return user.roles.some(
      (ur) => ur.role.code === "admin" || ur.role.code === "super_admin",
    );
  }

  /**
   * 构建上下文信息
   */
  private buildContext(session: SessionData): string {
    const parts: string[] = [];

    if (session.intent) {
      parts.push(`当前意图: ${session.intent}`);
    }

    if (
      session.extractedEntities &&
      Object.keys(session.extractedEntities).length > 0
    ) {
      parts.push(`已提取信息: ${JSON.stringify(session.extractedEntities)}`);
    }

    if (session.missingFields && session.missingFields.length > 0) {
      parts.push(`缺失字段: ${session.missingFields.join(", ")}`);
    }

    return parts.length > 0 ? parts.join("\n") : "";
  }

  /**
   * 记录操作日志
   */
  private async logAction(
    userId: string,
    intent: string,
    inputMessage: string,
    extractedData: Record<string, unknown>,
    result: {
      success: boolean;
      message: string;
      data?: Record<string, unknown>;
    },
  ): Promise<void> {
    try {
      await this.prisma.agentActionLog.create({
        data: {
          systemUserId: userId,
          intent,
          inputMessage,
          extractedData: JSON.stringify(extractedData),
          actionResult: JSON.stringify(result.data || {}),
          success: result.success,
        },
      });
    } catch (error) {
      this.logger.error(`记录操作日志失败: ${error}`);
    }
  }

  /**
   * 使用 AI 生成回复（用于复杂对话场景）
   */
  async generateAIResponse(
    userInput: string,
    context?: string,
  ): Promise<string> {
    if (!this.zhipuProvider.isConfigured()) {
      return "AI 功能暂未配置，请联系管理员。";
    }

    return this.zhipuProvider.generateResponse(userInput, context);
  }
}
