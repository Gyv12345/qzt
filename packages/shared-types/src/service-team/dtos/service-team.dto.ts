import { createZodDto } from '../../utils'
import {
  createServiceTeamSchema,
  updateServiceTeamSchema,
  serviceTeamSchema,
} from '../schemas'

/**
 * 创建服务团队 DTO
 */
export class CreateServiceTeamDto extends createZodDto(createServiceTeamSchema) {}

/**
 * 更新服务团队 DTO
 */
export class UpdateServiceTeamDto extends createZodDto(updateServiceTeamSchema) {}

/**
 * 服务团队实体 DTO
 */
export class ServiceTeamDto extends createZodDto(serviceTeamSchema) {}

// 导出关联的 Schema 供外部使用
export {
  createServiceTeamSchema,
  updateServiceTeamSchema,
  serviceTeamSchema,
} from '../schemas'
