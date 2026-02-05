import { z } from 'zod'

/**
 * 收款方式枚举（字符串版本）
 * 1: 银行转账, 2: 微信, 3: 支付宝, 4: 现金
 */
export const paymentMethodSchema = z.enum(['BANK_TRANSFER', 'WECHAT', 'ALIPAY', 'CASH'], {
  errorMap: () => ({ message: '收款方式必须是 BANK_TRANSFER、WECHAT、ALIPAY 或 CASH' }),
})

export type PaymentMethod = z.infer<typeof paymentMethodSchema>

/**
 * 收款状态枚举（字符串版本）
 */
export const paymentStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'CANCELLED'], {
  errorMap: () => ({ message: '收款状态必须是 PENDING、CONFIRMED 或 CANCELLED' }),
})

export type PaymentStatus = z.infer<typeof paymentStatusSchema>

/**
 * 基础收款记录 Schema
 */
export const paymentBaseSchema = z.object({
  contractId: z.string().cuid('请选择有效的合同'),
  amount: z.number().min(0, '收款金额必须大于等于0'),
  method: paymentMethodSchema,
  voucherUrl: z.string().url('请输入有效的凭证URL').optional().or(z.literal('')),
  payTime: z.coerce.date().optional(),
  remark: z.string().max(500, '备注最多500个字符').optional(),
})

export type PaymentBase = z.infer<typeof paymentBaseSchema>

/**
 * 完整收款记录 Schema
 */
export const paymentSchema = paymentBaseSchema.extend({
  id: z.string().cuid(),
  paymentNo: z.string().optional(), // 收款编号
  status: paymentStatusSchema.default('PENDING'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Payment = z.infer<typeof paymentSchema>

/**
 * 创建收款记录 DTO Schema
 */
export const createPaymentSchema = paymentBaseSchema

/**
 * 更新收款记录 DTO Schema
 */
export const updatePaymentSchema = paymentBaseSchema.partial()

export type UpdatePaymentBase = z.infer<typeof updatePaymentSchema>

/**
 * 查询收款记录 DTO Schema
 */
export const queryPaymentSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  keyword: z.string().optional(),
  contractId: z.string().cuid().optional(),
  method: paymentMethodSchema.optional(),
  status: paymentStatusSchema.optional(),
})

export type QueryPaymentParams = z.infer<typeof queryPaymentSchema>

/**
 * 收款记录列表响应（分页）
 */
export interface PaymentListResponse {
  data: Payment[]
  total: number
  page: number
  pageSize: number
  totalPages?: number
}

/**
 * 收款方式映射（用于显示）
 */
export const paymentMethodMap: Record<PaymentMethod, string> = {
  BANK_TRANSFER: '银行转账',
  WECHAT: '微信',
  ALIPAY: '支付宝',
  CASH: '现金',
}

/**
 * 收款状态映射（用于显示）
 */
export const paymentStatusMap: Record<PaymentStatus, string> = {
  PENDING: '待确认',
  CONFIRMED: '已确认',
  CANCELLED: '已取消',
}

/**
 * 获取收款方式显示名称
 */
export function getPaymentMethodLabel(method: PaymentMethod): string {
  return paymentMethodMap[method]
}

/**
 * 获取收款状态显示名称
 */
export function getPaymentStatusLabel(status: PaymentStatus): string {
  return paymentStatusMap[status]
}

// Legacy 数字枚举支持
export const paymentMethodLegacySchema = z.union([
  z.literal(1), // 银行转账 -> BANK_TRANSFER
  z.literal(2), // 微信 -> WECHAT
  z.literal(3), // 支付宝 -> ALIPAY
  z.literal(4), // 现金 -> CASH
])

export type PaymentMethodLegacy = z.infer<typeof paymentMethodLegacySchema>

export function toPaymentMethod(legacy: PaymentMethodLegacy): PaymentMethod {
  const map = { 1: 'BANK_TRANSFER', 2: 'WECHAT', 3: 'ALIPAY', 4: 'CASH' } as const
  return map[legacy]
}

export function toPaymentMethodLegacy(method: PaymentMethod): PaymentMethodLegacy {
  const map = { BANK_TRANSFER: 1, WECHAT: 2, ALIPAY: 3, CASH: 4 } as const
  return map[method]
}
