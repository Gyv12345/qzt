import { createZodDto } from '../../utils'
import {
  createSocialMediaAccountSchema,
  updateSocialMediaAccountSchema,
  createSocialMediaPostSchema,
  updateSocialMediaPostSchema,
  publishSocialMediaPostSchema,
  schedulePublishSchema,
  batchPublishSchema,
  refreshTokenSchema,
} from '../schemas'

/**
 * 创建社交媒体账号 DTO
 */
export class CreateSocialMediaAccountDto extends createZodDto(createSocialMediaAccountSchema) {}

/**
 * 更新社交媒体账号 DTO
 */
export class UpdateSocialMediaAccountDto extends createZodDto(updateSocialMediaAccountSchema) {}

/**
 * 创建社交媒体帖子 DTO
 */
export class CreateSocialMediaPostDto extends createZodDto(createSocialMediaPostSchema) {}

/**
 * 更新社交媒体帖子 DTO
 */
export class UpdateSocialMediaPostDto extends createZodDto(updateSocialMediaPostSchema) {}

/**
 * 发布帖子 DTO
 */
export class PublishSocialMediaPostDto extends createZodDto(publishSocialMediaPostSchema) {}

/**
 * 定时发布 DTO
 */
export class SchedulePublishDto extends createZodDto(schedulePublishSchema) {}

/**
 * 批量发布 DTO
 */
export class BatchPublishDto extends createZodDto(batchPublishSchema) {}

/**
 * 刷新令牌 DTO
 */
export class RefreshTokenDto extends createZodDto(refreshTokenSchema) {}

// 导出关联的 Schema 供外部使用
export {
  createSocialMediaAccountSchema,
  updateSocialMediaAccountSchema,
  createSocialMediaPostSchema,
  updateSocialMediaPostSchema,
  publishSocialMediaPostSchema,
  schedulePublishSchema,
  batchPublishSchema,
  refreshTokenSchema,
} from '../schemas'
