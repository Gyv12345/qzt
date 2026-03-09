import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  UseGuards,
  Request,
  Put,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { MessageHandlerService } from "./services/message-handler.service";
import { WechatMessageDto, AgentResponseDto } from "./dto/wechat-message.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  QueryActionLogDto,
  ActionLogDto,
  PaginatedActionLogsDto,
} from "./dto/query-action-log.dto";
import {
  QueryWechatUserMappingDto,
  BindWechatUserDto,
  WechatUserMappingDto,
  PaginatedWechatUserMappingsDto,
} from "./dto/wechat-user-mapping.dto";
import { AgentConfigDto, UpdateAgentConfigDto } from "./dto/agent-config.dto";
import { WechatUserMappingService } from "./services/wechat-user-mapping.service";
import { PrismaService } from "../../common/prisma/prisma.service";

/**
 * AI Agent Controller
 * 处理企业微信 Webhook 和测试请求
 */
@ApiTags("ai-agent")
@ApiBearerAuth()
@Controller("ai-agent")
export class AiAgentController {
  constructor(
    private readonly messageHandler: MessageHandlerService,
    private readonly wechatUserMapping: WechatUserMappingService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 企业微信 Webhook 入口
   * 接收企业微信消息并处理
   */
  @Post("webhook")
  @ApiOperation({ summary: "企业微信 Webhook 入口" })
  @ApiResponse({ status: 200, description: "处理成功", type: AgentResponseDto })
  async handleWebhook(
    @Body() message: WechatMessageDto,
  ): Promise<AgentResponseDto> {
    return this.messageHandler.handleMessage(
      message.wechatUserId,
      message.content || "",
    );
  }

  /**
   * 测试接口
   * 用于在管理后台测试 AI Agent 功能
   */
  @Post("test")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "测试 AI Agent 功能" })
  @ApiResponse({ status: 200, description: "测试成功", type: AgentResponseDto })
  async testAgent(
    @Body() message: WechatMessageDto,
    @Request() req: { user: { userId: string } },
  ): Promise<AgentResponseDto> {
    // 测试模式：直接使用当前登录用户
    return this.messageHandler.handleMessage(
      req.user.userId,
      message.content || "",
      true, // isTestMode
    );
  }

  /**
   * 简单的文本处理接口
   * 用于前端直接测试
   */
  @Get("chat")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "简单聊天接口" })
  @ApiResponse({ status: 200, description: "处理成功" })
  async chat(
    @Query("message") message: string,
    @Request() req: { user: { userId: string } },
  ): Promise<AgentResponseDto> {
    // 测试模式：直接使用当前登录用户
    return this.messageHandler.handleMessage(req.user.userId, message, true);
  }

  /**
   * 健康检查
   */
  @Get("health")
  @ApiOperation({ summary: "健康检查" })
  healthCheck(): { status: string; timestamp: string } {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  // ==================== 操作日志 API ====================

  /**
   * 获取 AI Agent 操作日志
   */
  @Get("logs")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取操作日志列表" })
  @ApiResponse({
    status: 200,
    description: "成功",
    type: PaginatedActionLogsDto,
  })
  async getActionLogs(
    @Query() query: QueryActionLogDto,
  ): Promise<PaginatedActionLogsDto> {
    const { page = 1, pageSize = 20, intent, success } = query;

    const where: Record<string, unknown> = {};
    if (intent) where.intent = intent;
    if (success !== undefined) where.success = success;

    const [logs, total] = await Promise.all([
      this.prisma.agentActionLog.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.agentActionLog.count({ where }),
    ]);

    const data: ActionLogDto[] = logs.map((log) => ({
      id: log.id,
      systemUserId: log.systemUserId,
      intent: log.intent,
      inputMessage: log.inputMessage,
      extractedData: log.extractedData,
      actionResult: log.actionResult,
      success: log.success,
      createdAt: log.createdAt.toISOString(),
    }));

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // ==================== 微信用户映射 API ====================

  /**
   * 获取企业微信用户映射列表
   */
  @Get("user-mappings")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取微信用户映射列表" })
  @ApiResponse({
    status: 200,
    description: "成功",
    type: PaginatedWechatUserMappingsDto,
  })
  async getWechatUserMappings(
    @Query() query: QueryWechatUserMappingDto,
  ): Promise<PaginatedWechatUserMappingsDto> {
    const { page = 1, pageSize = 20, isActive } = query;

    const { data: mappings, total } =
      await this.wechatUserMapping.getMappingList({
        page,
        pageSize,
        isActive,
      });

    const data: WechatUserMappingDto[] = mappings.map((m) => ({
      id: m.id,
      wechatUserId: m.wechatUserId,
      wechatUserName: m.wechatUserName ?? undefined,
      systemUserId: m.systemUserId ?? undefined,
      systemUserName: m.systemUserName ?? undefined,
      isActive: m.isActive,
    }));

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 绑定企业微信用户到系统用户
   */
  @Post("user-mappings/bind")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "绑定微信用户到系统用户" })
  @ApiResponse({ status: 200, description: "绑定成功" })
  async bindWechatUser(
    @Body() body: BindWechatUserDto,
  ): Promise<{ success: boolean }> {
    await this.wechatUserMapping.bindSystemUser(
      body.wechatUserId,
      body.systemUserId,
    );
    return { success: true };
  }

  /**
   * 解绑企业微信用户
   */
  @Post("user-mappings/unbind")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "解绑微信用户" })
  @ApiResponse({ status: 200, description: "解绑成功" })
  async unbindWechatUser(
    @Body() body: { wechatUserId: string },
  ): Promise<{ success: boolean }> {
    await this.wechatUserMapping.unbindSystemUser(body.wechatUserId);
    return { success: true };
  }

  // ==================== 配置管理 API ====================

  /**
   * 获取 AI Agent 配置
   * 注意：当前配置存储在环境变量中，这里返回脱敏信息
   */
  @Get("config")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "获取 AI Agent 配置" })
  @ApiResponse({ status: 200, description: "成功", type: AgentConfigDto })
  async getConfig(): Promise<AgentConfigDto> {
    // 从环境变量读取配置
    const provider = process.env.AI_PROVIDER || "zhipu";
    const model = process.env.AI_MODEL || "glm-4-flash";
    const apiKey = process.env.AI_API_KEY;

    return {
      enabled: !!apiKey,
      provider: provider as AgentConfigDto["provider"],
      model,
      // 不返回完整的 API Key，只返回是否已配置
      apiKey: apiKey ? "********" : undefined,
    };
  }

  /**
   * 更新 AI Agent 配置
   * 注意：当前实现仅更新运行时配置，持久化需要后续实现数据库存储
   */
  @Put("config")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "更新 AI Agent 配置" })
  @ApiResponse({ status: 200, description: "更新成功", type: AgentConfigDto })
  async updateConfig(
    @Body() body: UpdateAgentConfigDto,
  ): Promise<AgentConfigDto & { message: string }> {
    // TODO: 将配置持久化到数据库
    // 当前仅更新环境变量（进程级别，重启后失效）
    if (body.provider) process.env.AI_PROVIDER = body.provider;
    if (body.model) process.env.AI_MODEL = body.model;
    if (body.apiKey) process.env.AI_API_KEY = body.apiKey;

    return {
      enabled: !!process.env.AI_API_KEY,
      provider: (process.env.AI_PROVIDER ||
        "zhipu") as AgentConfigDto["provider"],
      model: process.env.AI_MODEL || "glm-4-flash",
      apiKey: process.env.AI_API_KEY ? "********" : undefined,
      message: "配置已更新（运行时，重启后失效）",
    };
  }
}
