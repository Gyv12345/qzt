import { createZodDto } from '../../utils'
import {
  createPermissionSchema,
  updatePermissionSchema,
  permissionSchema,
} from '../schemas'

/**
 * 创建权限 DTO
 */
export class CreatePermissionDto extends createZodDto(createPermissionSchema) {}

/**
 * 更新权限 DTO
 */
export class UpdatePermissionDto extends createZodDto(updatePermissionSchema) {}

/**
 * 权限实体 DTO
 */
export class PermissionDto extends createZodDto(permissionSchema) {}

// 导出关联的 Schema 供外部使用
export {
  createPermissionSchema,
  updatePermissionSchema,
  permissionSchema,
} from '../schemas'
