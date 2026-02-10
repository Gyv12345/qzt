import { z } from 'zod'

/**
 * 发票状态枚举（字符串版本）
 */
export const invoiceStatusSchema = z.enum(['PENDING', 'ISSUED', 'CANCELLED'], {
  message: '发票状态必须是 PENDING、ISSUED 或 CANCELLED',
})

export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>

/**
 * 基础发票 Schema
 */
export const invoiceBaseSchema = z.object({
  customerId: z.string().cuid('请选择有效的客户'),
  contractId: z.string().cuid('请选择有效的合同').optional(),
  amount: z.number().min(0, '开票金额必须大于等于0'),
  count: z.number().int().min(1, '开票张数必须大于等于1'),
  month: z.string().regex(/^\d{4}-\d{2}$/, { message: '开票月份格式必须为 YYYY-MM' }),
  remark: z.string().max(500, '备注最多500个字符').optional(),
})

export type InvoiceBase = z.infer<typeof invoiceBaseSchema>

/**
 * 完整发票 Schema
 */
export const invoiceSchema = invoiceBaseSchema.extend({
  id: z.string().cuid(),
  invoiceNo: z.string().optional(), // 发票编号
  status: invoiceStatusSchema.default('PENDING'),
  issuedAt: z.coerce.date().optional(), // 开票日期
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Invoice = z.infer<typeof invoiceSchema>

/**
 * 创建发票 DTO Schema
 */
export const createInvoiceSchema = invoiceBaseSchema

/**
 * 更新发票 DTO Schema
 */
export const updateInvoiceSchema = invoiceBaseSchema.partial()

export type UpdateInvoiceBase = z.infer<typeof updateInvoiceSchema>

/**
 * 查询发票 DTO Schema
 */
export const queryInvoiceSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  keyword: z.string().optional(),
  customerId: z.string().cuid().optional(),
  contractId: z.string().cuid().optional(),
  status: invoiceStatusSchema.optional(),
  month: z.string().optional(),
})

export type QueryInvoiceParams = z.infer<typeof queryInvoiceSchema>

/**
 * 发票列表响应（分页）
 */
export interface InvoiceListResponse {
  data: Invoice[]
  total: number
  page: number
  pageSize: number
  totalPages?: number
}

/**
 * 发票状态映射（用于显示）
 */
export const invoiceStatusMap: Record<InvoiceStatus, string> = {
  PENDING: '待开票',
  ISSUED: '已开票',
  CANCELLED: '已作废',
}

/**
 * 获取发票状态显示名称
 */
export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  return invoiceStatusMap[status]
}

// Legacy 数字枚举支持
export const invoiceStatusLegacySchema = z.union([
  z.literal(0), // 待开票 -> PENDING
  z.literal(1), // 已开票 -> ISSUED
  z.literal(2), // 已作废 -> CANCELLED
])

export type InvoiceStatusLegacy = z.infer<typeof invoiceStatusLegacySchema>

export function toInvoiceStatus(legacy: InvoiceStatusLegacy): InvoiceStatus {
  const map = { 0: 'PENDING', 1: 'ISSUED', 2: 'CANCELLED' } as const
  return map[legacy]
}

export function toInvoiceStatusLegacy(status: InvoiceStatus): InvoiceStatusLegacy {
  const map = { PENDING: 0, ISSUED: 1, CANCELLED: 2 } as const
  return map[status]
}
