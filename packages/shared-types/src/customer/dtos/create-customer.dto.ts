import { createZodDto } from '../../utils'
import { createCustomerSchema } from '../schemas'

/**
 * 创建客户 DTO
 *
 * 使用 Zod Schema 生成验证规则
 * 在 NestJS Controller 中通过 @Body() 装饰器使用
 */
export class CreateCustomerDto extends createZodDto(createCustomerSchema) {
  // Schema 定义的验证规则自动生效
  // 可通过 CreateCustomerDto.validate() 静态方法验证
}

// 导出关联的 Schema 供外部使用
export { createCustomerSchema } from '../schemas'
