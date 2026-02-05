import { createZodDto } from '../../utils'
import {
  queryLoginLogSchema,
} from '../schemas'

/**
 * 查询登录日志 DTO
 */
export class QueryLoginLogDto extends createZodDto(queryLoginLogSchema) {}

// 导出关联的 Schema 供外部使用
export {
  queryLoginLogSchema,
} from '../schemas'
