import { Injectable, Logger } from "@nestjs/common";
import { ZhipuProvider } from "../providers/zhipu.provider";
import { IntentRecognitionResult } from "../prompts/intent-prompt";

/**
 * 意图解析服务
 */
@Injectable()
export class IntentParserService {
  private readonly logger = new Logger(IntentParserService.name);

  constructor(private readonly zhipuProvider: ZhipuProvider) {}

  /**
   * 解析用户输入的意图
   */
  async parse(
    userInput: string,
    context?: string,
  ): Promise<IntentRecognitionResult> {
    this.logger.debug(`解析意图: ${userInput}`);

    if (!this.zhipuProvider.isConfigured()) {
      this.logger.warn("AI Provider 未配置，使用默认规则匹配");
      return this.fallbackParse(userInput);
    }

    try {
      const result = await this.zhipuProvider.parseIntent(userInput, context);
      this.logger.debug(`意图解析结果: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`意图解析失败: ${error}`);
      return this.fallbackParse(userInput);
    }
  }

  /**
   * 降级处理：使用规则匹配意图
   */
  private fallbackParse(userInput: string): IntentRecognitionResult {
    const input = userInput.toLowerCase();

    // 客户相关
    if (
      input.includes("新建客户") ||
      input.includes("创建客户") ||
      input.includes("添加客户")
    ) {
      return {
        intent: "create_customer",
        confidence: 0.8,
        entities: this.extractCustomerEntities(input),
        missingFields: [],
      };
    }

    // 跟进记录
    if (
      input.includes("跟进") ||
      input.includes("记录") ||
      input.includes("沟通")
    ) {
      return {
        intent: "create_follow_record",
        confidence: 0.7,
        entities: this.extractFollowRecordEntities(input),
        missingFields: [],
      };
    }

    // 合同
    if (input.includes("合同") || input.includes("签约")) {
      return {
        intent: "create_contract",
        confidence: 0.8,
        entities: this.extractContractEntities(input),
        missingFields: [],
      };
    }

    // 回款
    if (
      input.includes("回款") ||
      input.includes("收款") ||
      input.includes("付款")
    ) {
      return {
        intent: "create_payment",
        confidence: 0.8,
        entities: this.extractPaymentEntities(input),
        missingFields: [],
      };
    }

    // 查询
    if (
      input.includes("查询") ||
      input.includes("查找") ||
      input.includes("搜索")
    ) {
      return {
        intent: "query_customer",
        confidence: 0.7,
        entities: {},
        missingFields: [],
      };
    }

    // 帮助
    if (
      input.includes("帮助") ||
      input.includes("怎么") ||
      input.includes("如何")
    ) {
      return {
        intent: "help",
        confidence: 0.9,
        entities: {},
        missingFields: [],
      };
    }

    return {
      intent: "unknown",
      confidence: 0,
      entities: {},
      missingFields: [],
    };
  }

  private extractCustomerEntities(input: string): Record<string, unknown> {
    const entities: Record<string, unknown> = {};

    // 尝试提取公司名称（假设格式：新建客户XXX公司）
    const companyMatch = input.match(
      /(?:新建|创建|添加)?客户[：:]*\s*(.+?)(?:公司|有限|$)/,
    );
    if (companyMatch) {
      entities.companyName =
        companyMatch[1] + (input.includes("公司") ? "公司" : "");
    }

    // 尝试提取联系人
    const contactMatch = input.match(/联系人[：:]*\s*(\S+)/);
    if (contactMatch) {
      entities.contactName = contactMatch[1];
    }

    // 尝试提取电话
    const phoneMatch = input.match(/(?:电话|手机)[：:]*\s*(\d{11})/);
    if (phoneMatch) {
      entities.phone = phoneMatch[1];
    }

    return entities;
  }

  private extractFollowRecordEntities(input: string): Record<string, unknown> {
    const entities: Record<string, unknown> = {};

    // 提取跟进类型
    if (input.includes("电话")) {
      entities.type = "电话";
    } else if (input.includes("微信")) {
      entities.type = "微信";
    } else if (input.includes("邮件")) {
      entities.type = "邮件";
    } else if (input.includes("拜访")) {
      entities.type = "拜访";
    }

    return entities;
  }

  private extractContractEntities(input: string): Record<string, unknown> {
    const entities: Record<string, unknown> = {};

    // 提取金额
    const amountMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:万|w|元)/i);
    if (amountMatch) {
      let amount = parseFloat(amountMatch[1]);
      if (input.includes("万") || input.toLowerCase().includes("w")) {
        amount *= 10000;
      }
      entities.amount = amount;
    }

    return entities;
  }

  private extractPaymentEntities(input: string): Record<string, unknown> {
    const entities: Record<string, unknown> = {};

    // 提取金额
    const amountMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:万|w|元)/i);
    if (amountMatch) {
      let amount = parseFloat(amountMatch[1]);
      if (input.includes("万") || input.toLowerCase().includes("w")) {
        amount *= 10000;
      }
      entities.amount = amount;
    }

    return entities;
  }
}
