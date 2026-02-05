import { z } from 'zod'

/**
 * Webhook 平台枚举
 */
export const webhookPlatformSchema = z.enum(['WECOM', 'FEISHU', 'DINGTALK'], {
  errorMap: () => ({ message: 'Webhook 平台必须是 WECOM、FEISHU 或 DINGTALK' }),
})

export type WebhookPlatform = z.infer<typeof webhookPlatformSchema>

/**
 * 基础 Webhook 配置 Schema
 */
export const webhookConfigBaseSchema = z.object({
  name: z.string().min(1, '配置名称不能为空').max(100, '配置名称最多100个字符'),
  platform: webhookPlatformSchema,
  webhookUrl: z.string().url('请输入有效的 Webhook URL'),
})

export type WebhookConfigBase = z.infer<typeof webhookConfigBaseSchema>

/**
 * 完整 Webhook 配置 Schema
 */
export const webhookConfigSchema = webhookConfigBaseSchema.extend({
  id: z.string().cuid(),
  enabled: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type WebhookConfig = z.infer<typeof webhookConfigSchema>

/**
 * 创建 Webhook 配置 DTO Schema
 */
export const createWebhookConfigSchema = webhookConfigBaseSchema

/**
 * 更新 Webhook 配置 DTO Schema
 */
export const updateWebhookConfigSchema = webhookConfigBaseSchema.partial().extend({
  enabled: z.boolean().optional(),
})

/**
 * 发送 Webhook Schema
 */
export const sendWebhookSchema = z.object({
  webhookId: z.string().cuid(),
  message: z.object({
    title: z.string().optional(),
    content: z.string(),
  }),
})

export type SendWebhook = z.infer<typeof sendWebhookSchema>

/**
 * 测试 Webhook Schema
 */
export const testWebhookSchema = z.object({
  webhookUrl: z.string().url('请输入有效的 Webhook URL'),
  platform: webhookPlatformSchema,
})

export type TestWebhook = z.infer<typeof testWebhookSchema>

/**
 * Webhook 平台映射（用于显示）
 */
export const webhookPlatformMap: Record<WebhookPlatform, string> = {
  WECOM: '企业微信',
  FEISHU: '飞书',
  DINGTALK: '钉钉',
}

/**
 * 获取 Webhook 平台显示名称
 */
export function getWebhookPlatformLabel(platform: WebhookPlatform): string {
  return webhookPlatformMap[platform]
}
