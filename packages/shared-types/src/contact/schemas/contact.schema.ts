import { z } from 'zod'

/**
 * 联系人状态枚举（字符串版本）
 */
export const contactStatusSchema = z.enum(['ACTIVE', 'INACTIVE'], {
  message: '联系人状态必须是 ACTIVE 或 INACTIVE',
})

export type ContactStatus = z.infer<typeof contactStatusSchema>

/**
 * 基础联系人 Schema
 */
export const contactBaseSchema = z.object({
  name: z.string().min(1, '联系人姓名不能为空').max(50, '姓名最多50个字符'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' }),
  email: z.string().email('请输入有效的邮箱地址').optional(),
  wechat: z.string().max(50, '微信号最多50个字符').optional(),
  position: z.string().max(50, '职位最多50个字符').optional(),
  department: z.string().max(50, '部门最多50个字符').optional(),
  birthdate: z.coerce.date().optional(),
  customerId: z.string().cuid('请选择有效的客户').optional(),
  tags: z.string().optional(), // JSON数组字符串
  remark: z.string().max(500, '备注最多500个字符').optional(),
})

export type ContactBase = z.infer<typeof contactBaseSchema>

/**
 * 完整联系人 Schema
 */
export const contactSchema = contactBaseSchema.extend({
  id: z.string().cuid(),
  status: contactStatusSchema.default('ACTIVE'),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Contact = z.infer<typeof contactSchema>

/**
 * 创建联系人 DTO Schema
 */
export const createContactSchema = contactBaseSchema

/**
 * 更新联系人 DTO Schema
 */
export const updateContactSchema = contactBaseSchema.partial()

export type UpdateContactBase = z.infer<typeof updateContactSchema>

/**
 * 查询联系人 DTO Schema
 */
export const queryContactSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  keyword: z.string().optional(),
  customerId: z.string().cuid().optional(),
  sortField: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type QueryContactParams = z.infer<typeof queryContactSchema>

/**
 * 联系人列表响应（分页）
 */
export interface ContactListResponse {
  data: Contact[]
  total: number
  page: number
  pageSize: number
  totalPages?: number
}

/**
 * 联系人状态映射（用于显示）
 */
export const contactStatusMap: Record<ContactStatus, string> = {
  ACTIVE: '启用',
  INACTIVE: '禁用',
}

/**
 * 获取联系人状态显示名称
 */
export function getContactStatusLabel(status: ContactStatus): string {
  return contactStatusMap[status]
}
