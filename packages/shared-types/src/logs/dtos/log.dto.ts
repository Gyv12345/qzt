import { createZodDto } from '../../utils'
import {
  queryOperationLogSchema,
  querySystemLogSchema,
} from '../schemas'

/**
 * 查询操作日志 DTO
 */
export class QueryOperationLogDto extends createZodDto(queryOperationLogSchema) {}

/**
 * 查询系统日志 DTO
 */
export class QuerySystemLogDto extends createZodDto(querySystemLogSchema) {}

// 导出关联的 Schema 供外部使用
export {
  queryOperationLogSchema,
  querySystemLogSchema,
} from '../schemas'
