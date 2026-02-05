import { z } from 'zod'

/**
 * 角色类型枚举
 */
export const roleTypeSchema = z.enum(['SYSTEM', 'TEAM'], {
  errorMap: () => ({ message: '角色类型必须是 SYSTEM 或 TEAM' }),
})

export type RoleType = z.infer<typeof roleTypeSchema>

/**
 * 数据范围类型枚举
 */
export const dataScopeTypeSchema = z.enum(
  ['ALL', 'DEPARTMENT', 'DEPARTMENT_AND_SUB', 'CUSTOM', 'SELF'],
  {
    errorMap: () => ({ message: '数据范围类型无效' }),
  },
)

export type DataScopeType = z.infer<typeof dataScopeTypeSchema>

/**
 * 基础角色 Schema
 */
export const roleBaseSchema = z.object({
  name: z.string().min(1, '角色名称不能为空').max(50, '角色名称最多50个字符'),
  code: z.string().min(1, '角色代码不能为空').max(50, '角色代码最多50个字符'),
  description: z.string().max(200, '描述最多200个字符').optional(),
  type: roleTypeSchema.default('TEAM'),
  dataScope: dataScopeTypeSchema.default('SELF'),
  dataScopeDeptIds: z.string().optional(), // JSON字符串，自定义部门ID列表
  permissionIds: z.array(z.string().cuid()).optional(),
})

export type RoleBase = z.infer<typeof roleBaseSchema>

/**
 * 完整角色 Schema
 */
export const roleSchema = roleBaseSchema.extend({
  id: z.string().cuid(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Role = z.infer<typeof roleSchema>

/**
 * 角色详情 Schema（含关联权限）
 */
export const roleDetailSchema = roleSchema.extend({
  permissions: z.array(z.any()).optional(), // Permission[]
})

export type RoleDetail = z.infer<typeof roleDetailSchema>

/**
 * 创建角色 DTO Schema
 */
export const createRoleSchema = roleBaseSchema

/**
 * 更新角色 DTO Schema
 */
export const updateRoleSchema = roleBaseSchema.partial()

/**
 * 角色类型映射（用于显示）
 */
export const roleTypeMap: Record<RoleType, string> = {
  SYSTEM: '系统角色',
  TEAM: '团队角色',
}

/**
 * 数据范围类型映射（用于显示）
 */
export const dataScopeTypeMap: Record<DataScopeType, string> = {
  ALL: '查看全部数据',
  DEPARTMENT: '仅查看本部门数据',
  DEPARTMENT_AND_SUB: '查看本部门及下级部门数据',
  CUSTOM: '自定义部门',
  SELF: '仅查看本人数据',
}

/**
 * 获取角色类型显示名称
 */
export function getRoleTypeLabel(type: RoleType): string {
  return roleTypeMap[type]
}

/**
 * 获取数据范围类型显示名称
 */
export function getDataScopeTypeLabel(scope: DataScopeType): string {
  return dataScopeTypeMap[scope]
}
