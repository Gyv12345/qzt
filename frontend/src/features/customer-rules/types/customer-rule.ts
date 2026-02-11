import { z } from "zod";

// 客户规则 Schema
export const customerRuleSchema = z.object({
  id: z.number(), // 后端返回的 id 是 number 类型
  code: z.string(),
  title: z.string(),
  description: z.string().optional(),
  daysValue: z.number(),
  enabled: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type CustomerRule = z.infer<typeof customerRuleSchema>;

// 客户规则表单值
export const customerRuleFormSchema = z.object({
  title: z.string().min(1, "规则标题不能为空"),
  description: z.string().optional(),
  daysValue: z.number().min(0, "天数不能为负数"),
  enabled: z.boolean(),
});

export type CustomerRuleFormValues = z.infer<typeof customerRuleFormSchema>;

// 规则代码枚举（用于预设规则）
export enum CustomerRuleCode {
  FOLLOW_DAYS = "FOLLOW_DAYS", // 跟进天数
  NO_CONTACT_DAYS = "NO_CONTACT_DAYS", // 未联系天数
  CONTRACT_EXPIRY_DAYS = "CONTRACT_EXPIRY_DAYS", // 合同到期天数
  PAYMENT_OVERDUE_DAYS = "PAYMENT_OVERDUE_DAYS", // 付款逾期天数
}
