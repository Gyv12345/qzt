import { createZodDto } from '../../utils'
import {
  createFollowRecordSchema,
  updateFollowRecordSchema,
  followRecordSchema,
} from '../schemas'

/**
 * 创建跟进记录 DTO
 */
export class CreateFollowRecordDto extends createZodDto(createFollowRecordSchema) {}

/**
 * 更新跟进记录 DTO
 */
export class UpdateFollowRecordDto extends createZodDto(updateFollowRecordSchema) {}

/**
 * 跟进记录实体 DTO
 */
export class FollowRecordDto extends createZodDto(followRecordSchema) {}

// 导出关联的 Schema 供外部使用
export {
  createFollowRecordSchema,
  updateFollowRecordSchema,
  followRecordSchema,
} from '../schemas'
