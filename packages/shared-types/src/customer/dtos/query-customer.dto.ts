import { createZodDto } from '../../utils'
import { queryCustomerSchema } from '../schemas'

/**
 * 查询客户 DTO
 *
 * 用于分页查询和筛选
 */
export class QueryCustomerDto extends createZodDto(queryCustomerSchema) {
  // Schema 定义的验证规则自动生效
}

// 导出关联的 Schema 供外部使用
export { queryCustomerSchema } from '../schemas'
