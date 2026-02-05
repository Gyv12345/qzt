import { z } from 'zod'

/**
 * 客户等级枚举
 * 0: 线索公司, 1: 意向客户, 2: 正式客户, 3: VIP客户
 */
export const customerLevelSchema = z.enum(['LEAD', 'PROSPECT', 'CUSTOMER', 'VIP'], {
  errorMap: () => ({ message: '客户等级必须是 LEAD, PROSPECT, CUSTOMER 或 VIP' }),
})

export type CustomerLevel = z.infer<typeof customerLevelSchema>

/**
 * 客户状态枚举
 * 1: 启用, 0: 禁用
 */
export const customerStatusSchema = z.enum(['ACTIVE', 'INACTIVE'], {
  errorMap: () => ({ message: '客户状态必须是 ACTIVE 或 INACTIVE' }),
})

export type CustomerStatus = z.infer<typeof customerStatusSchema>

/**
 * 公司规模选项
 */
export const companyScaleSchema = z.enum([
  '1-10人',
  '11-50人',
  '51-200人',
  '201-500人',
  '500人以上',
], {
  errorMap: () => ({ message: '请选择有效的公司规模' }),
})

export type CompanyScale = z.infer<typeof companyScaleSchema>

/**
 * 基础客户 Schema（不含 id、时间戳等自动生成字段）
 */
export const customerBaseSchema = z.object({
  name: z.string().min(1, '公司名称不能为空').max(200, '公司名称最多200个字符'),
  shortName: z.string().max(100, '公司简称最多100个字符').optional(),
  code: z.string().max(50, '公司编码最多50个字符').optional(),
  industry: z.string().max(50, '行业最多50个字符').optional(),
  scale: companyScaleSchema.optional(),
  address: z.string().max(500, '公司地址最多500个字符').optional(),
  website: z.string().url('请输入有效的网址').optional().or(z.literal('')),
  customerLevel: customerLevelSchema.default('LEAD'),
  sourceChannel: z.string().max(100, '来源渠道最多100个字符').optional(),
  followUserId: z.string().cuid('请选择有效的跟进人').optional(),
  tags: z.string().optional(),
  remark: z.string().max(1000, '备注最多1000个字符').optional(),
})

export type CustomerBase = z.infer<typeof customerBaseSchema>

/**
 * 完整客户 Schema（含所有字段）
 */
export const customerSchema = customerBaseSchema.extend({
  id: z.string().cuid(),
  followUserName: z.string().optional(),
  firstContactDate: z.coerce.date().optional(),
  contractDate: z.coerce.date().optional(),
  status: customerStatusSchema.default('ACTIVE'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Customer = z.infer<typeof customerSchema>

/**
 * 创建客户 DTO Schema
 */
export const createCustomerSchema = customerBaseSchema

/**
 * 更新客户 DTO Schema（所有字段可选）
 */
export const updateCustomerSchema = customerBaseSchema.partial()

/**
 * 查询客户 DTO Schema
 */
export const queryCustomerSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  keyword: z.string().optional(),
  customerLevel: customerLevelSchema.optional(),
  status: customerStatusSchema.optional(),
  followUserId: z.string().cuid().optional(),
  sortField: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
})

export type QueryCustomerParams = z.infer<typeof queryCustomerSchema>

/**
 * 客户等级映射（用于显示）
 */
export const customerLevelMap: Record<CustomerLevel, string> = {
  LEAD: '线索公司',
  PROSPECT: '意向客户',
  CUSTOMER: '正式客户',
  VIP: 'VIP客户',
}

/**
 * 客户状态映射（用于显示）
 */
export const customerStatusMap: Record<CustomerStatus, string> = {
  ACTIVE: '启用',
  INACTIVE: '禁用',
}

/**
 * 获取客户等级显示名称
 */
export function getCustomerLevelLabel(level: CustomerLevel): string {
  return customerLevelMap[level]
}

/**
 * 获取客户状态显示名称
 */
export function getCustomerStatusLabel(status: CustomerStatus): string {
  return customerStatusMap[status]
}
