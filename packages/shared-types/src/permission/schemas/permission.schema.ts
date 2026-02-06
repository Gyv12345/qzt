import { z } from 'zod'

/**
 * 权限类型枚举
 */
export const permissionTypeSchema = z.enum(['MENU', 'BUTTON', 'DATA'], {
  errorMap: () => ({ message: '权限类型必须是 MENU、BUTTON 或 DATA' }),
})

export type PermissionType = z.infer<typeof permissionTypeSchema>

/**
 * 基础权限 Schema
 */
export const permissionBaseSchema = z.object({
  name: z.string().min(1, '权限名称不能为空').max(50, '权限名称最多50个字符'),
  code: z.string().min(1, '权限代码不能为空').max(100, '权限代码最多100个字符'),
  type: permissionTypeSchema,
  description: z.string().max(200, '描述最多200个字符').optional(),
  parentId: z.string().optional(),
})

export type PermissionBase = z.infer<typeof permissionBaseSchema>

/**
 * 完整权限 Schema
 */
export const permissionSchema = permissionBaseSchema.extend({
  id: z.string().cuid(),
  parentId: z.string().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Permission = z.infer<typeof permissionSchema>

/**
 * 创建权限 DTO Schema
 */
export const createPermissionSchema = permissionBaseSchema

/**
 * 更新权限 DTO Schema
 */
export const updatePermissionSchema = permissionBaseSchema.partial()

/**
 * 权限类型映射（用于显示）
 */
export const permissionTypeMap: Record<PermissionType, string> = {
  MENU: '菜单',
  BUTTON: '按钮',
  DATA: '数据',
}

/**
 * 获取权限类型显示名称
 */
export function getPermissionTypeLabel(type: PermissionType): string {
  return permissionTypeMap[type]
}
