import { createZodDto } from '../../utils'
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  queryInvoiceSchema,
  invoiceSchema,
} from '../schemas'

/**
 * 创建发票 DTO
 */
export class CreateInvoiceDto extends createZodDto(createInvoiceSchema) {}

/**
 * 更新发票 DTO
 */
export class UpdateInvoiceDto extends createZodDto(updateInvoiceSchema) {}

/**
 * 查询发票 DTO
 */
export class QueryInvoiceDto extends createZodDto(queryInvoiceSchema) {}

/**
 * 发票实体 DTO
 */
export class InvoiceDto extends createZodDto(invoiceSchema) {}

// 导出关联的 Schema 供外部使用
export {
  createInvoiceSchema,
  updateInvoiceSchema,
  queryInvoiceSchema,
  invoiceSchema,
} from '../schemas'
