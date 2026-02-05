import { z } from 'zod'
import {
  departmentSchema as departmentStringSchema,
  departmentBaseSchema as departmentBaseStringSchema,
  createDepartmentSchema as createDepartmentStringSchema,
  updateDepartmentSchema as updateDepartmentStringSchema,
} from './department.schema'

/**
 * 兼容旧版本数字枚举的部门 Schema
 *
 * 后端当前使用数字枚举：0=禁用, 1=启用
 * 用于渐进式迁移
 */

// 数字枚举版本（兼容旧数据）
export const departmentStatusLegacySchema = z.union([
  z.literal(0), // 禁用 -> INACTIVE
  z.literal(1), // 启用 -> ACTIVE
])

export type DepartmentStatusLegacy = z.infer<typeof departmentStatusLegacySchema>

// 带数字枚举的 Department Schema
export const departmentSchemaLegacy = departmentStringSchema
  .omit({ status: true })
  .extend({
    status: departmentStatusLegacySchema,
  })

export type DepartmentLegacy = z.infer<typeof departmentSchemaLegacy>

// 基础 Schema（带数字枚举）
export const departmentBaseSchemaLegacy = departmentBaseStringSchema
  .omit({ status: true })
  .extend({
    status: departmentStatusLegacySchema.optional(),
  })

// 创建 Schema（带数字枚举）
export const createDepartmentSchemaLegacy = createDepartmentStringSchema
  .omit({ status: true })
  .extend({
    status: departmentStatusLegacySchema.optional(),
  })

// 更新 Schema（带数字枚举）
export const updateDepartmentSchemaLegacy = updateDepartmentStringSchema
  .omit({ status: true })
  .extend({
    status: departmentStatusLegacySchema.optional(),
  })

// 导出类型映射工具
export function toDepartmentStatus(legacy: DepartmentStatusLegacy): 'ACTIVE' | 'INACTIVE' {
  return legacy === 1 ? 'ACTIVE' : 'INACTIVE'
}

export function toDepartmentStatusLegacy(status: 'ACTIVE' | 'INACTIVE'): DepartmentStatusLegacy {
  return status === 'ACTIVE' ? 1 : 0
}

// 部门状态映射（数字版本）
export const departmentStatusLegacyMap: Record<DepartmentStatusLegacy, string> = {
  0: '禁用',
  1: '启用',
}

/**
 * 获取部门状态显示名称（数字版本）
 */
export function getDepartmentStatusLabelLegacy(status: DepartmentStatusLegacy): string {
  return departmentStatusLegacyMap[status]
}
