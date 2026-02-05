import { z } from 'zod'
import {
  customerSchema as customerStringSchema,
  createCustomerSchema as createCustomerStringSchema,
  updateCustomerSchema as updateCustomerStringSchema,
} from './customer.schema'

/**
 * 兼容旧版本数字枚举的 Schema
 *
 * 用于渐进式迁移，将数字枚举转换为字符串枚举
 */

// 数字枚举版本（兼容旧数据）
export const customerLevelLegacySchema = z.union([
  z.literal(0), // 线索公司 -> LEAD
  z.literal(1), // 意向客户 -> PROSPECT
  z.literal(2), // 正式客户 -> CUSTOMER
  z.literal(3), // VIP客户 -> VIP
])

export type CustomerLevelLegacy = z.infer<typeof customerLevelLegacySchema>

// 映射函数
function mapLegacyLevelToLevel(level: CustomerLevelLegacy) {
  const map = { 0: 'LEAD', 1: 'PROSPECT', 2: 'CUSTOMER', 3: 'VIP' } as const
  return map[level]
}

function mapLevelToLegacyLevel(level: 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'VIP') {
  const map = { LEAD: 0, PROSPECT: 1, CUSTOMER: 2, VIP: 3 } as const
  return map[level]
}

// 带数字枚举的 Customer Schema（用于兼容前端现有代码）
export const customerSchemaLegacy = customerStringSchema
  .omit({ customerLevel: true })
  .extend({
    customerLevel: customerLevelLegacySchema,
  })

export type CustomerLegacy = z.infer<typeof customerSchemaLegacy>

// 创建 Schema（带数字枚举）
export const createCustomerSchemaLegacy = createCustomerStringSchema
  .omit({ customerLevel: true })
  .extend({
    customerLevel: customerLevelLegacySchema.optional(),
  })

// 更新 Schema（带数字枚举）
export const updateCustomerSchemaLegacy = updateCustomerStringSchema
  .omit({ customerLevel: true })
  .extend({
    customerLevel: customerLevelLegacySchema.optional(),
  })

// 查询 Schema（带数字枚举）
export const queryCustomerSchemaLegacy = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  keyword: z.string().optional(),
  customerLevel: customerLevelLegacySchema.optional(),
  status: z.enum(['active', 'inactive']).optional(),
  followUserId: z.string().optional(),
  sortField: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export type QueryCustomerParamsLegacy = z.infer<typeof queryCustomerSchemaLegacy>

// 客户列表响应（兼容旧版本）
export interface CustomerListResponse {
  items: CustomerLegacy[]
  total: number
  page: number
  pageSize: number
}

// 导出类型映射工具
export function toCustomerLevel(legacy: CustomerLevelLegacy): 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'VIP' {
  return mapLegacyLevelToLevel(legacy)
}

export function toCustomerLevelLegacy(level: 'LEAD' | 'PROSPECT' | 'CUSTOMER' | 'VIP'): CustomerLevelLegacy {
  return mapLevelToLegacyLevel(level)
}
