/**
 * 意图识别提示词
 */

export interface IntentRecognitionResult {
  intent:
    | "create_customer"
    | "create_follow_record"
    | "create_contract"
    | "create_payment"
    | "query_customer"
    | "help"
    | "unknown";
  confidence: number;
  entities: Record<string, unknown>;
  missingFields: string[];
}

export const INTENT_PROMPT = `分析用户的输入，识别其意图并提取相关实体。

## 意图类型

1. create_customer - 创建客户
   必需字段: companyName (公司名称)
   可选字段: contactName (联系人), phone (电话), industry (行业), address (地址)

2. create_follow_record - 创建跟进记录
   必需字段: customerId 或 customerName (客户标识), content (跟进内容)
   可选字段: type (跟进类型: 电话/微信/邮件/拜访/其他)

3. create_contract - 创建合同
   必需字段: customerId 或 customerName, amount (金额), serviceStart (服务开始日期), serviceEnd (服务结束日期)
   可选字段: contractName (合同名称)

4. create_payment - 创建回款
   必需字段: contractId 或 customerName (合同/客户标识), amount (金额)
   可选字段: paymentDate (回款日期), remark (备注)

5. query_customer - 查询客户
   可选字段: companyName (公司名称), contactName (联系人名称), phone (电话)

6. help - 帮助
   用户询问如何使用系统或寻求帮助

7. unknown - 无法识别

## 输出格式

请以 JSON 格式输出：
{
  "intent": "意图类型",
  "confidence": 0.0-1.0,
  "entities": {
    "提取的实体字段": "值"
  },
  "missingFields": ["缺失的必需字段"]
}

## 用户输入

{{userInput}}

## 上下文

{{context}}
`;

/**
 * 获取意图识别提示词
 */
export function getIntentPrompt(userInput: string, context?: string): string {
  return INTENT_PROMPT.replace("{{userInput}}", userInput).replace(
    "{{context}}",
    context || "无上下文",
  );
}
