import { z } from 'zod'

// 客户等级
export const customerLevelSchema = z.union([
  z.literal(0), // 线索公司
  z.literal(1), // 意向客户
  z.literal(2), // 正式客户
  z.literal(3), // VIP客户
])
export type CustomerLevel = z.infer<typeof customerLevelSchema>

// 客户状态
export const customerStatusSchema = z.union([
  z.literal('active'),
  z.literal('inactive'),
])
export type CustomerStatus = z.infer<typeof customerStatusSchema>

// 客户 Schema
export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string().optional(),
  code: z.string().optional(),
  industry: z.string().optional(),
  scale: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  customerLevel: customerLevelSchema,
  sourceChannel: z.string().optional(),
  followUserId: z.string().optional(),
  followUserName: z.string().optional(),
  firstContactDate: z.string().optional(),
  contractDate: z.string().optional(),
  tags: z.string().optional(),
  remark: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Customer = z.infer<typeof customerSchema>

// 客户列表响应
export interface CustomerListResponse {
  items: Customer[]
  total: number
  page: number
  pageSize: number
}
