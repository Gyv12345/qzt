import { createZodDto } from '../../utils'
import { updateCustomerSchema } from '../schemas'

/**
 * 更新客户 DTO
 *
 * 所有字段都是可选的
 */
export class UpdateCustomerDto extends createZodDto(updateCustomerSchema) {
  // Schema 定义的验证规则自动生效
}

// 导出关联的 Schema 供外部使用
export { updateCustomerSchema } from '../schemas'
