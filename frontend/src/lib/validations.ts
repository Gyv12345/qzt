import { z } from 'zod'

/**
 * 通用验证 Schema
 */

// 用户名验证
export const usernameSchema = z.string()
  .min(2, '用户名至少2个字符')
  .max(50, '用户名最多50个字符')
  .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线')

// 密码验证
export const passwordSchema = z.string()
  .min(6, '密码至少6个字符')
  .max(100, '密码最多100个字符')

// 手机号验证
export const phoneSchema = z.string()
  .regex(/^1[3-9]\d{9}$/, '请输入正确的手机号')

// 邮箱验证
export const emailSchema = z.string()
  .email('请输入正确的邮箱地址')
  .or(z.literal(''))

// 公司名称验证
export const companyNameSchema = z.string()
  .min(1, '公司名称不能为空')
  .max(200, '公司名称最多200个字符')

// 联系人姓名验证
export const contactNameSchema = z.string()
  .min(1, '姓名不能为空')
  .max(50, '姓名最多50个字符')

/**
 * 业务实体验证 Schema
 */

// 客户验证 Schema
export const customerSchema = z.object({
  name: companyNameSchema,
  shortName: z.string().max(100, '简称最多100个字符').optional(),
  code: z.string().max(50, '编码最多50个字符').optional(),
  industry: z.string().max(100, '行业最多100个字符').optional(),
  scale: z.string().max(50, '规模最多50个字符').optional(),
  address: z.string().max(500, '地址最多500个字符').optional(),
  website: z.string().url('请输入正确的网址').or(z.literal('')).optional(),
  customerLevel: z.number().int().min(0).max(3),
  sourceChannel: z.string().max(100, '来源渠道最多100个字符').optional(),
  followUserId: z.string().optional(),
  tags: z.string().max(500, '标签最多500个字符').optional(),
  remark: z.string().max(2000, '备注最多2000个字符').optional(),
  status: z.number().int().min(0).max(1).default(1),
})

// 联系人验证 Schema
export const contactSchema = z.object({
  name: contactNameSchema,
  phone: phoneSchema,
  email: emailSchema,
  wechat: z.string().max(50, '微信号最多50个字符').optional(),
  position: z.string().max(50, '职位最多50个字符').optional(),
  department: z.string().max(100, '部门最多100个字符').optional(),
  birthdate: z.string().optional(),
  tags: z.string().max(500, '标签最多500个字符').optional(),
  remark: z.string().max(2000, '备注最多2000个字符').optional(),
  status: z.number().int().min(0).max(1).default(1),
})

// 产品验证 Schema
export const productSchema = z.object({
  name: z.string().min(1, '产品名称不能为空').max(200, '产品名称最多200个字符'),
  code: z.string().max(50, '产品编码最多50个字符').optional(),
  category: z.string().max(100, '分类最多100个字符').optional(),
  unit: z.string().max(20, '单位最多20个字符').optional(),
  price: z.number().min(0, '价格不能为负数'),
  description: z.string().max(2000, '描述最多2000个字符').optional(),
  status: z.number().int().min(0).max(1).default(1),
})

// 合同验证 Schema
export const contractSchema = z.object({
  contractNo: z.string().min(1, '合同编号不能为空').max(100, '合同编号最多100个字符'),
  name: z.string().min(1, '合同名称不能为空').max(200, '合同名称最多200个字符'),
  amount: z.number().min(0, '合同金额不能为负数'),
  startDate: z.string().min(1, '开始日期不能为空'),
  endDate: z.string().min(1, '结束日期不能为空'),
  customerId: z.string().min(1, '客户不能为空'),
  status: z.string().optional(),
})

/**
 * 表单验证 Schema
 */

// 登录表单验证
export const loginFormSchema = z.object({
  username: z.string().min(1, '用户名不能为空'),
  password: z.string().min(1, '密码不能为空'),
})

// 注册表单验证
export const registerFormSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
})

/**
 * 类型导出
 */
export type CustomerFormData = z.infer<typeof customerSchema>
export type ContactFormData = z.infer<typeof contactSchema>
export type ProductFormData = z.infer<typeof productSchema>
export type ContractFormData = z.infer<typeof contractSchema>
export type LoginFormData = z.infer<typeof loginFormSchema>
export type RegisterFormData = z.infer<typeof registerFormSchema>
