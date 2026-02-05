import { createZodDto } from '../../utils'
import {
  createWebhookConfigSchema,
  updateWebhookConfigSchema,
  sendWebhookSchema,
  testWebhookSchema,
} from '../schemas'

/**
 * 创建 Webhook 配置 DTO
 */
export class CreateWebhookConfigDto extends createZodDto(createWebhookConfigSchema) {}

/**
 * 更新 Webhook 配置 DTO
 */
export class UpdateWebhookConfigDto extends createZodDto(updateWebhookConfigSchema) {}

/**
 * 发送 Webhook DTO
 */
export class SendWebhookDto extends createZodDto(sendWebhookSchema) {}

/**
 * 测试 Webhook DTO
 */
export class TestWebhookDto extends createZodDto(testWebhookSchema) {}

// 导出关联的 Schema 供外部使用
export {
  createWebhookConfigSchema,
  updateWebhookConfigSchema,
  sendWebhookSchema,
  testWebhookSchema,
} from '../schemas'
