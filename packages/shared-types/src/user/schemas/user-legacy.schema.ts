import { z } from 'zod'
import {
  userSchema as userStringSchema,
  userBaseSchema as userBaseStringSchema,
  createUserSchema as createUserStringSchema,
  updateUserSchema as updateUserStringSchema,
} from './user.schema'

/**
 * 兼容旧版本数字枚举的用户 Schema
 *
 * 后端当前使用数字枚举：0=禁用, 1=启用
 * 用于渐进式迁移
 */

// 数字枚举版本（兼容旧数据）
export const userStatusLegacySchema = z.union([
  z.literal(0), // 禁用 -> INACTIVE
  z.literal(1), // 启用 -> ACTIVE
])

export type UserStatusLegacy = z.infer<typeof userStatusLegacySchema>

// 映射函数
function mapLegacyStatusToStatus(status: UserStatusLegacy) {
  return status === 1 ? 'ACTIVE' : 'INACTIVE'
}

function mapStatusToLegacyStatus(status: 'ACTIVE' | 'INACTIVE') {
  return status === 'ACTIVE' ? 1 : 0
}

// 带数字枚举的 User Schema（用于兼容前端现有代码）
export const userSchemaLegacy = userStringSchema
  .omit({ status: true })
  .extend({
    status: userStatusLegacySchema,
  })

export type UserLegacy = z.infer<typeof userSchemaLegacy>

// 基础 Schema（带数字枚举）
export const userBaseSchemaLegacy = userBaseStringSchema
  .omit({ status: true })
  .extend({
    status: userStatusLegacySchema.optional(),
  })

// 创建 Schema（带数字枚举）
export const createUserSchemaLegacy = createUserStringSchema
  .omit({ status: true })
  .extend({
    status: userStatusLegacySchema.optional(),
  })

// 更新 Schema（带数字枚举）
export const updateUserSchemaLegacy = updateUserStringSchema
  .omit({ status: true })
  .extend({
    status: userStatusLegacySchema.optional(),
  })

// 查询 Schema（带数字枚举）
export const queryUserSchemaLegacy = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  departmentId: z.string().optional(),
  status: userStatusLegacySchema.optional(),
  roleId: z.string().optional(),
})

export type QueryUserParamsLegacy = z.infer<typeof queryUserSchemaLegacy>

// 用户列表响应（兼容旧版本）
export interface UserListResponseLegacy {
  data: UserLegacy[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// 导出类型映射工具
export function toUserStatus(legacy: UserStatusLegacy): 'ACTIVE' | 'INACTIVE' {
  return mapLegacyStatusToStatus(legacy)
}

export function toUserStatusLegacy(status: 'ACTIVE' | 'INACTIVE'): UserStatusLegacy {
  return mapStatusToLegacyStatus(status)
}

// 用户状态映射（数字版本）
export const userStatusLegacyMap: Record<UserStatusLegacy, string> = {
  0: '禁用',
  1: '启用',
}

/**
 * 获取用户状态显示名称（数字版本）
 */
export function getUserStatusLabelLegacy(status: UserStatusLegacy): string {
  return userStatusLegacyMap[status]
}
