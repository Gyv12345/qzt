import { z } from 'zod'

/**
 * 用户状态枚举（字符串版本）
 */
export const userStatusSchema = z.enum(['ACTIVE', 'INACTIVE'], {
  errorMap: () => ({ message: '用户状态必须是 ACTIVE 或 INACTIVE' }),
})

export type UserStatus = z.infer<typeof userStatusSchema>

/**
 * 用户角色 Schema
 */
export const userRoleSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  code: z.string(),
})

export type UserRole = z.infer<typeof userRoleSchema>

/**
 * 用户角色关联 Schema（含关系）
 */
export const userRoleWithRelationSchema = z.object({
  role: userRoleSchema,
})

export type UserRoleWithRelation = z.infer<typeof userRoleWithRelationSchema>

/**
 * 用户关联的部门信息 Schema（简化版）
 */
export const userDepartmentSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
})

export type UserDepartment = z.infer<typeof userDepartmentSchema>

/**
 * 基础用户 Schema（创建时使用）
 */
export const userBaseSchema = z.object({
  username: z.string().min(1, '用户名不能为空').max(50, '用户名最多50个字符'),
  password: z.string().min(6, '密码至少6个字符'),
  name: z.string().min(1, '姓名不能为空').max(50, '姓名最多50个字符'),
  email: z.string().email('请输入有效的邮箱地址').optional(),
  phone: z.string().max(20, '手机号最多20个字符').optional(),
  departmentId: z.string().cuid('请选择有效的部门').optional(),
  roleIds: z.array(z.string().cuid()).optional(),
  status: userStatusSchema.optional().default('ACTIVE'),
})

export type UserBase = z.infer<typeof userBaseSchema>

/**
 * 完整用户 Schema（含所有字段）
 */
export const userSchema = userBaseSchema.extend({
  id: z.string().cuid(),
  avatar: z.string().optional(),
  isSystem: z.boolean().optional(),
  department: userDepartmentSchema.optional(),
  roles: z.array(userRoleWithRelationSchema).optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
}).omit({ password: true, roleIds: true })

export type User = z.infer<typeof userSchema>

/**
 * 创建用户 DTO Schema
 */
export const createUserSchema = userBaseSchema

/**
 * 更新用户 DTO Schema（所有字段可选）
 */
export const updateUserSchema = userBaseSchema.partial().omit({ password: true }).extend({
  password: z.string().min(6, '密码至少6个字符').optional(),
})

export type UpdateUserBase = z.infer<typeof updateUserSchema>

/**
 * 查询用户 DTO Schema
 */
export const queryUserSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  departmentId: z.string().cuid().optional(),
  status: userStatusSchema.optional(),
  roleId: z.string().cuid().optional(),
})

export type QueryUserParams = z.infer<typeof queryUserSchema>

/**
 * 重置密码 Schema
 */
export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, '新密码至少6个字符'),
})

export type ResetPassword = z.infer<typeof resetPasswordSchema>

/**
 * 用户列表响应（分页）
 */
export interface UserListResponse {
  data: User[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 用户状态映射（用于显示）
 */
export const userStatusMap: Record<UserStatus, string> = {
  ACTIVE: '启用',
  INACTIVE: '禁用',
}

/**
 * 获取用户状态显示名称
 */
export function getUserStatusLabel(status: UserStatus): string {
  return userStatusMap[status]
}
