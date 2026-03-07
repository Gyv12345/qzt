import { createZodDto } from '../../utils'
import {
  createRoleSchema,
  updateRoleSchema,
  roleSchema,
} from '../schemas'

/**
 * 创建角色 DTO
 */
export class CreateRoleDto extends createZodDto(createRoleSchema) {}

/**
 * 更新角色 DTO
 */
export class UpdateRoleDto extends createZodDto(updateRoleSchema) {}

/**
 * 角色实体 DTO
 */
export class RoleDto extends createZodDto(roleSchema) {}

// 导出关联的 Schema 供外部使用
export {
  createRoleSchema,
  updateRoleSchema,
  roleSchema,
} from '../schemas'
