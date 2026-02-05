import { z } from 'zod'

/**
 * 产品状态枚举（字符串版本）
 */
export const productStatusSchema = z.enum(['ACTIVE', 'INACTIVE'], {
  errorMap: () => ({ message: '产品状态必须是 ACTIVE 或 INACTIVE' }),
})

export type ProductStatus = z.infer<typeof productStatusSchema>

/**
 * 基础产品 Schema
 */
export const productBaseSchema = z.object({
  name: z.string().min(1, '产品名称不能为空').max(100, '产品名称最多100个字符'),
  code: z.string().min(1, '产品代码不能为空').max(50, '产品代码最多50个字符'),
  description: z.string().max(500, '产品描述最多500个字符').optional(),
  price: z.number().min(0, '价格必须大于等于0'),
  invoiceLimit: z.number().int().min(0, '开票额度必须大于等于0'),
  invoiceCount: z.number().int().min(0, '开票张数必须大于等于0'),
  overLimitPrice: z.number().min(0, '超额单价必须大于等于0'),
})

export type ProductBase = z.infer<typeof productBaseSchema>

/**
 * 完整产品 Schema
 */
export const productSchema = productBaseSchema.extend({
  id: z.string().cuid(),
  status: productStatusSchema.default('ACTIVE'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Product = z.infer<typeof productSchema>

/**
 * 创建产品 DTO Schema
 */
export const createProductSchema = productBaseSchema

/**
 * 更新产品 DTO Schema
 */
export const updateProductSchema = productBaseSchema.partial()

export type UpdateProductBase = z.infer<typeof updateProductSchema>

/**
 * 查询产品 DTO Schema
 */
export const queryProductSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  keyword: z.string().optional(),
  status: productStatusSchema.optional(),
})

export type QueryProductParams = z.infer<typeof queryProductSchema>

/**
 * 产品列表响应（分页）
 */
export interface ProductListResponse {
  data: Product[]
  total: number
  page: number
  pageSize: number
  totalPages?: number
}

/**
 * 产品状态映射（用于显示）
 */
export const productStatusMap: Record<ProductStatus, string> = {
  ACTIVE: '启用',
  INACTIVE: '禁用',
}

/**
 * 获取产品状态显示名称
 */
export function getProductStatusLabel(status: ProductStatus): string {
  return productStatusMap[status]
}

// Legacy 数字枚举支持
export const productStatusLegacySchema = z.union([
  z.literal(0), // 禁用 -> INACTIVE
  z.literal(1), // 启用 -> ACTIVE
])

export type ProductStatusLegacy = z.infer<typeof productStatusLegacySchema>

export function toProductStatus(legacy: ProductStatusLegacy): ProductStatus {
  return legacy === 1 ? 'ACTIVE' : 'INACTIVE'
}

export function toProductStatusLegacy(status: ProductStatus): ProductStatusLegacy {
  return status === 'ACTIVE' ? 1 : 0
}
