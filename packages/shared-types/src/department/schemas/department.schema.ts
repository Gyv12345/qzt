import { z } from 'zod'

/**
 * 部门状态枚举（字符串版本）
 */
export const departmentStatusSchema = z.enum(['ACTIVE', 'INACTIVE'], {
  message: '部门状态必须是 ACTIVE 或 INACTIVE',
})

export type DepartmentStatus = z.infer<typeof departmentStatusSchema>

/**
 * 基础部门 Schema（创建时使用）
 */
export const departmentBaseSchema = z.object({
  name: z.string().min(1, '部门名称不能为空').max(50, '部门名称最多50个字符'),
  parentId: z.string().cuid('请选择有效的父部门').optional(),
  sort: z.number().int().min(0, '排序值必须大于等于0').default(0),
  status: departmentStatusSchema.default('ACTIVE'),
})

export type DepartmentBase = z.infer<typeof departmentBaseSchema>

/**
 * 完整部门 Schema（含所有字段）
 */
export const departmentSchema = departmentBaseSchema.extend({
  id: z.string().cuid(),
  isSystem: z.boolean().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type Department = z.infer<typeof departmentSchema>

/**
 * 部门树形结构接口
 */
export interface DepartmentTree extends Department {
  children?: DepartmentTree[]
}

/**
 * 创建部门 DTO Schema
 */
export const createDepartmentSchema = departmentBaseSchema

/**
 * 更新部门 DTO Schema（所有字段可选）
 */
export const updateDepartmentSchema = departmentBaseSchema.partial()

/**
 * 部门状态映射（用于显示）
 */
export const departmentStatusMap: Record<DepartmentStatus, string> = {
  ACTIVE: '启用',
  INACTIVE: '禁用',
}

/**
 * 获取部门状态显示名称
 */
export function getDepartmentStatusLabel(status: DepartmentStatus): string {
  return departmentStatusMap[status]
}
