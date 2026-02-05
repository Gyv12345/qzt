export {
  departmentStatusSchema,
  departmentBaseSchema,
  departmentSchema,
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentStatusMap,
  getDepartmentStatusLabel,
  type DepartmentStatus,
  type DepartmentBase,
  type Department,
  type DepartmentTree,
} from './department.schema'

// Legacy exports for gradual migration (数字枚举版本)
export {
  departmentStatusLegacySchema,
  departmentSchemaLegacy,
  departmentBaseSchemaLegacy,
  createDepartmentSchemaLegacy,
  updateDepartmentSchemaLegacy,
  toDepartmentStatus,
  toDepartmentStatusLegacy,
  departmentStatusLegacyMap,
  getDepartmentStatusLabelLegacy,
  type DepartmentStatusLegacy,
  type DepartmentLegacy,
} from './department-legacy.schema'
