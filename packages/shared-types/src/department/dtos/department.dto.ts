import { createZodDto } from '../../utils'
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentSchema,
} from '../schemas'

/**
 * 创建部门 DTO
 */
export class CreateDepartmentDto extends createZodDto(createDepartmentSchema) {}

/**
 * 更新部门 DTO
 */
export class UpdateDepartmentDto extends createZodDto(updateDepartmentSchema) {}

/**
 * 部门实体 DTO
 */
export class DepartmentDto extends createZodDto(departmentSchema) {}

// 导出关联的 Schema 供外部使用
export {
  createDepartmentSchema,
  updateDepartmentSchema,
  departmentSchema,
} from '../schemas'
