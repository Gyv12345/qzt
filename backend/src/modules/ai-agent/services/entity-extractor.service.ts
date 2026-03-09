import { Injectable, Logger } from "@nestjs/common";
import { ZhipuProvider } from "../providers/zhipu.provider";

/**
 * 实体提取服务
 */
@Injectable()
export class EntityExtractorService {
  private readonly logger = new Logger(EntityExtractorService.name);

  // 各意图所需的字段
  private readonly requiredFields: Record<string, string[]> = {
    create_customer: ["companyName"],
    create_follow_record: ["customerId", "content"],
    create_contract: ["customerId", "amount", "serviceStart", "serviceEnd"],
    create_payment: ["contractId", "amount"],
    query_customer: [],
    help: [],
    unknown: [],
  };

  constructor(private readonly zhipuProvider: ZhipuProvider) {}

  /**
   * 获取意图所需的字段
   */
  getRequiredFields(intent: string): string[] {
    return this.requiredFields[intent] || [];
  }

  /**
   * 检查实体是否完整
   */
  checkMissingFields(
    intent: string,
    entities: Record<string, unknown>,
  ): string[] {
    const required = this.getRequiredFields(intent);
    return required.filter((field) => {
      const value = entities[field];
      return value === undefined || value === null || value === "";
    });
  }

  /**
   * 从用户输入中提取实体
   */
  async extract(
    userInput: string,
    intent: string,
    existingEntities?: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    this.logger.debug(`提取实体，意图: ${intent}`);

    const requiredFields = this.getRequiredFields(intent);

    if (requiredFields.length === 0) {
      return existingEntities || {};
    }

    // 合并已有实体
    const entities = { ...existingEntities };

    // 使用 AI 提取实体
    if (this.zhipuProvider.isConfigured()) {
      try {
        const extracted = await this.zhipuProvider.extractEntities(
          userInput,
          intent,
          requiredFields,
        );
        Object.assign(entities, extracted);
      } catch (error) {
        this.logger.error(`AI 实体提取失败: ${error}`);
      }
    }

    // 使用规则补充提取
    this.ruleBasedExtract(userInput, intent, entities);

    return entities;
  }

  /**
   * 基于规则的实体提取
   */
  private ruleBasedExtract(
    input: string,
    intent: string,
    entities: Record<string, unknown>,
  ): void {
    // 提取金额
    if (!entities.amount) {
      const amountMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:万|w|元)/i);
      if (amountMatch) {
        let amount = parseFloat(amountMatch[1]);
        if (input.includes("万") || input.toLowerCase().includes("w")) {
          amount *= 10000;
        }
        entities.amount = amount;
      }
    }

    // 提取电话
    if (!entities.phone) {
      const phoneMatch = input.match(/1[3-9]\d{9}/);
      if (phoneMatch) {
        entities.phone = phoneMatch[0];
      }
    }

    // 提取日期
    if (!entities.serviceStart || !entities.serviceEnd) {
      const dateMatch = input.match(/(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/g);
      if (dateMatch && dateMatch.length >= 2) {
        if (!entities.serviceStart) {
          entities.serviceStart = this.parseDate(dateMatch[0]);
        }
        if (!entities.serviceEnd) {
          entities.serviceEnd = this.parseDate(dateMatch[1]);
        }
      }

      // 处理"一年"、"半年"等相对时间
      if (input.includes("一年") || input.includes("1年")) {
        const today = new Date();
        if (!entities.serviceStart) {
          entities.serviceStart = today.toISOString().split("T")[0];
        }
        if (!entities.serviceEnd) {
          const endDate = new Date(today);
          endDate.setFullYear(endDate.getFullYear() + 1);
          entities.serviceEnd = endDate.toISOString().split("T")[0];
        }
      }
    }

    // 提取公司名称
    if (intent === "create_customer" && !entities.companyName) {
      // 尝试匹配 "XXX公司" 格式
      const companyMatch = input.match(
        /([^，。！？,]+(?:公司|科技|集团|企业))/,
      );
      if (companyMatch) {
        entities.companyName = companyMatch[1];
      }
    }
  }

  /**
   * 解析日期字符串
   */
  private parseDate(dateStr: string): string {
    // 处理中文格式
    const normalized = dateStr
      .replace(/年/g, "-")
      .replace(/月/g, "-")
      .replace(/日/g, "")
      .replace(/\//g, "-");

    try {
      const date = new Date(normalized);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    } catch {
      // 忽略解析错误
    }

    return normalized;
  }

  /**
   * 获取字段的友好名称
   */
  getFieldDisplayName(field: string): string {
    const fieldNames: Record<string, string> = {
      companyName: "公司名称",
      contactName: "联系人姓名",
      phone: "联系电话",
      customerId: "客户",
      customerName: "客户名称",
      content: "跟进内容",
      amount: "金额",
      serviceStart: "服务开始日期",
      serviceEnd: "服务结束日期",
      contractId: "合同",
      contractName: "合同名称",
      type: "跟进类型",
      remark: "备注",
    };
    return fieldNames[field] || field;
  }

  /**
   * 生成缺失字段的提示消息
   */
  generateMissingFieldsMessage(missingFields: string[]): string {
    if (missingFields.length === 0) {
      return "";
    }

    const fieldNames = missingFields.map((f) => this.getFieldDisplayName(f));
    if (fieldNames.length === 1) {
      return `请提供${fieldNames[0]}。`;
    }

    const last = fieldNames.pop();
    return `请提供${fieldNames.join("、")}和${last}。`;
  }
}
