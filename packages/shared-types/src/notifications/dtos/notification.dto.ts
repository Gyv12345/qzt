import { createZodDto } from '../../utils'
import {
  createNotificationSchema,
  markAsReadSchema,
} from '../schemas'

/**
 * 创建通知 DTO
 */
export class CreateNotificationDto extends createZodDto(createNotificationSchema) {}

/**
 * 批量标记已读 DTO
 */
export class MarkAsReadDto extends createZodDto(markAsReadSchema) {}

// 导出关联的 Schema 供外部使用
export {
  createNotificationSchema,
  markAsReadSchema,
} from '../schemas'
