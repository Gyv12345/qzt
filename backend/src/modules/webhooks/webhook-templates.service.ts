import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { WebhooksService } from "./webhooks.service";
import {
  CreateWebhookTemplateDto,
  UpdateWebhookTemplateDto,
  SendTemplateDto,
  PreviewTemplateDto,
} from "./dto/webhook-template.dto";

@Injectable()
export class WebhookTemplatesService {
  private readonly logger = new Logger(WebhookTemplatesService.name);

  constructor(
    private prisma: PrismaService,
    private webhooksService: WebhooksService,
  ) {}

  /**
   * 创建消息模板
   */
  async create(dto: CreateWebhookTemplateDto) {
    // 检查代码是否已存在
    const existing = await this.prisma.webhookTemplate.findUnique({
      where: { code: dto.code },
    });

    if (existing) {
      throw new Error(`模板代码已存在: ${dto.code}`);
    }

    const template = await this.prisma.webhookTemplate.create({
      data: {
        ...dto,
        variables: dto.variables ? JSON.stringify(dto.variables) : null,
      },
    });

    this.logger.log(`创建消息模板: ${dto.code}`);
    return template;
  }

  /**
   * 获取模板列表
   */
  async findAll(query?: { platform?: string; enabled?: boolean }) {
    const where: any = {};

    if (query?.platform) {
      where.platform = { in: [query.platform, "all"] };
    }

    if (query?.enabled !== undefined) {
      where.enabled = query.enabled;
    }

    return this.prisma.webhookTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * 获取模板详情
   */
  async findOne(id: string) {
    const template = await this.prisma.webhookTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new NotFoundException(`模板不存在: ${id}`);
    }

    return template;
  }

  /**
   * 根据代码获取模板
   */
  async findByCode(code: string) {
    const template = await this.prisma.webhookTemplate.findUnique({
      where: { code },
    });

    if (!template) {
      throw new NotFoundException(`模板不存在: ${code}`);
    }

    return template;
  }

  /**
   * 更新模板
   */
  async update(id: string, dto: UpdateWebhookTemplateDto) {
    const existing = await this.findOne(id);

    // 如果修改了代码，检查新代码是否已存在
    if (dto.code && dto.code !== existing.code) {
      const codeExists = await this.prisma.webhookTemplate.findUnique({
        where: { code: dto.code },
      });

      if (codeExists) {
        throw new Error(`模板代码已存在: ${dto.code}`);
      }
    }

    const template = await this.prisma.webhookTemplate.update({
      where: { id },
      data: {
        ...dto,
        variables: dto.variables ? JSON.stringify(dto.variables) : undefined,
      },
    });

    this.logger.log(`更新消息模板: ${template.code}`);
    return template;
  }

  /**
   * 删除模板
   */
  async remove(id: string) {
    const existing = await this.findOne(id);

    await this.prisma.webhookTemplate.delete({
      where: { id },
    });

    this.logger.log(`删除消息模板: ${existing.code}`);
    return { message: "删除成功" };
  }

  /**
   * 切换模板启用状态
   */
  async toggle(id: string) {
    const existing = await this.findOne(id);

    const template = await this.prisma.webhookTemplate.update({
      where: { id },
      data: { enabled: !existing.enabled },
    });

    this.logger.log(
      `切换模板状态: ${template.code}, 启用: ${template.enabled}`,
    );
    return template;
  }

  /**
   * 渲染模板内容
   */
  renderTemplate(content: string, variables: Record<string, any>): string {
    let rendered = content;

    // 替换变量占位符 {{variable}}
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
      rendered = rendered.replace(regex, String(value ?? ""));
    }

    // 替换未提供的变量为空字符串
    rendered = rendered.replace(/\{\{\s*\w+\s*\}\}/g, "");

    return rendered;
  }

  /**
   * 预览模板
   */
  async preview(dto: PreviewTemplateDto) {
    const template = await this.findByCode(dto.templateCode);

    const rendered = this.renderTemplate(
      template.content,
      dto.variables || {},
    );

    return {
      template: {
        code: template.code,
        name: template.name,
        platform: template.platform,
        messageType: template.messageType,
      },
      original: template.content,
      rendered,
    };
  }

  /**
   * 使用模板发送消息
   */
  async sendWithTemplate(dto: SendTemplateDto) {
    const template = await this.findByCode(dto.templateCode);

    if (!template.enabled) {
      throw new Error(`模板已禁用: ${dto.templateCode}`);
    }

    // 渲染模板内容
    const renderedContent = this.renderTemplate(template.content, dto.variables);

    // 获取要发送的配置
    let configs: any[] = [];
    if (dto.configIds && dto.configIds.length > 0) {
      // 发送到指定配置
      configs = await this.prisma.webhookConfig.findMany({
        where: {
          id: { in: dto.configIds },
          enabled: true,
        },
      });
    } else {
      // 发送到所有启用的配置
      configs = await this.prisma.webhookConfig.findMany({
        where: {
          enabled: true,
          // 如果模板指定了平台，则只发送到该平台
          ...(template.platform !== "all" && { platform: template.platform }),
        },
      });
    }

    if (configs.length === 0) {
      return {
        success: false,
        message: "没有可用的 Webhook 配置",
        results: [],
      };
    }

    // 构建消息内容
    const content = this.buildMessageContent(
      template.messageType,
      renderedContent,
    );

    // 发送到所有配置
    const results = await Promise.allSettled(
      configs.map(async (config) => {
        try {
          const result = await this.webhooksService.sendMessage({
            configId: config.id,
            messageType: template.messageType as "text" | "markdown" | "card",
            content,
          });

          return {
            configId: config.id,
            configName: config.name,
            platform: config.platform,
            success: result.success,
            error: result.error,
          };
        } catch (error: any) {
          return {
            configId: config.id,
            configName: config.name,
            platform: config.platform,
            success: false,
            error: error.message,
          };
        }
      }),
    );

    const successCount = results.filter(
      (r) => r.status === "fulfilled" && (r.value as any).success,
    ).length;

    this.logger.log(
      `模板发送完成: ${dto.templateCode}, 成功: ${successCount}/${configs.length}`,
    );

    return {
      success: successCount > 0,
      message: `发送完成，成功 ${successCount}/${configs.length}`,
      results: results.map((r) =>
        r.status === "fulfilled" ? r.value : { success: false, error: r.reason },
      ),
    };
  }

  /**
   * 构建消息内容
   */
  private buildMessageContent(
    messageType: string,
    renderedContent: string,
  ): Record<string, any> {
    switch (messageType) {
      case "text":
        return { content: renderedContent };
      case "markdown":
        return { content: renderedContent };
      case "card":
        // 卡片消息需要解析结构，这里简化处理
        return {
          title: "通知",
          content: renderedContent,
        };
      default:
        return { content: renderedContent };
    }
  }

  /**
   * 初始化默认模板
   */
  async initDefaultTemplates() {
    const defaultTemplates = [
      {
        name: "新客户通知",
        code: "new_customer_notify",
        platform: "all",
        messageType: "markdown",
        content: `## 🎉 新客户通知

**客户名称**：{{customerName}}
**联系电话**：{{phone}}
**客户来源**：{{source}}
**创建时间**：{{createdAt}}

请及时跟进处理！`,
        variables: {
          customerName: { type: "string", description: "客户名称" },
          phone: { type: "string", description: "联系电话" },
          source: { type: "string", description: "客户来源" },
          createdAt: { type: "datetime", description: "创建时间" },
        },
        description: "新客户创建时发送的通知模板",
      },
      {
        name: "合同到期提醒",
        code: "contract_expire_remind",
        platform: "all",
        messageType: "markdown",
        content: `## ⚠️ 合同到期提醒

**合同编号**：{{contractNo}}
**客户名称**：{{customerName}}
**合同金额**：{{amount}}
**到期日期**：{{expireDate}}
**剩余天数**：{{remainingDays}} 天

请及时处理合同续签事宜！`,
        variables: {
          contractNo: { type: "string", description: "合同编号" },
          customerName: { type: "string", description: "客户名称" },
          amount: { type: "number", description: "合同金额" },
          expireDate: { type: "date", description: "到期日期" },
          remainingDays: { type: "number", description: "剩余天数" },
        },
        description: "合同即将到期时发送的提醒模板",
      },
      {
        name: "收款成功通知",
        code: "payment_success_notify",
        platform: "all",
        messageType: "markdown",
        content: `## 💰 收款成功通知

**客户名称**：{{customerName}}
**收款金额**：¥{{amount}}
**支付方式**：{{paymentMethod}}
**收款时间**：{{paidAt}}
**合同编号**：{{contractNo}}

收款已确认到账！`,
        variables: {
          customerName: { type: "string", description: "客户名称" },
          amount: { type: "number", description: "收款金额" },
          paymentMethod: { type: "string", description: "支付方式" },
          paidAt: { type: "datetime", description: "收款时间" },
          contractNo: { type: "string", description: "合同编号" },
        },
        description: "收款成功后发送的通知模板",
      },
      {
        name: "跟进提醒",
        code: "follow_up_remind",
        platform: "all",
        messageType: "text",
        content: `【跟进提醒】
客户：{{customerName}}
提醒内容：{{content}}
计划时间：{{scheduledTime}}

请及时跟进！`,
        variables: {
          customerName: { type: "string", description: "客户名称" },
          content: { type: "string", description: "提醒内容" },
          scheduledTime: { type: "datetime", description: "计划时间" },
        },
        description: "跟进提醒模板",
      },
    ];

    for (const template of defaultTemplates) {
      const existing = await this.prisma.webhookTemplate.findUnique({
        where: { code: template.code },
      });

      if (!existing) {
        await this.create(template as CreateWebhookTemplateDto);
        this.logger.log(`初始化默认模板: ${template.code}`);
      }
    }
  }
}
