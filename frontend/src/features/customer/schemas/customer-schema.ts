import { z } from 'zod'

export const customerSchema = z.object({
  name: z.string().min(1, '公司名称不能为空'),
  customerLevel: z.enum(['VIP', 'NORMAL'], {
    required_error: '请选择客户等级',
  }),
  industry: z.string().optional(),
  contact: z.string().min(1, '联系人不能为空'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  email: z.string().email('邮箱格式不正确').optional().or(z.literal('')),
  address: z.string().optional(),
  taxNumber: z.string().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
})

export type CustomerFormData = z.infer<typeof customerSchema>

export const customerSearchSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(10),
  keyword: z.string().optional(),
  customerLevel: z.array(z.string()).optional(),
  sortField: z.enum(['name', 'createdAt', 'customerLevel']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type CustomerSearch = z.infer<typeof customerSearchSchema>
