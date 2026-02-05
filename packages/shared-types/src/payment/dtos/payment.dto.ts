import { createZodDto } from '../../utils'
import {
  createPaymentSchema,
  updatePaymentSchema,
  queryPaymentSchema,
  paymentSchema,
} from '../schemas'

/**
 * 创建收款记录 DTO
 */
export class CreatePaymentDto extends createZodDto(createPaymentSchema) {}

/**
 * 更新收款记录 DTO
 */
export class UpdatePaymentDto extends createZodDto(updatePaymentSchema) {}

/**
 * 查询收款记录 DTO
 */
export class QueryPaymentDto extends createZodDto(queryPaymentSchema) {}

/**
 * 收款记录实体 DTO
 */
export class PaymentDto extends createZodDto(paymentSchema) {}

// 导出关联的 Schema 供外部使用
export {
  createPaymentSchema,
  updatePaymentSchema,
  queryPaymentSchema,
  paymentSchema,
} from '../schemas'
