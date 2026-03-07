import { createZodDto } from '../../utils'
import {
  createContractSchema,
  updateContractSchema,
  queryContractSchema,
  contractSchema,
} from '../schemas'

/**
 * 创建合同 DTO
 */
export class CreateContractDto extends createZodDto(createContractSchema) {}

/**
 * 更新合同 DTO
 */
export class UpdateContractDto extends createZodDto(updateContractSchema) {}

/**
 * 查询合同 DTO
 */
export class QueryContractDto extends createZodDto(queryContractSchema) {}

/**
 * 合同实体 DTO
 */
export class ContractDto extends createZodDto(contractSchema) {}

// 导出关联的 Schema 供外部使用
export {
  createContractSchema,
  updateContractSchema,
  queryContractSchema,
  contractSchema,
} from '../schemas'
