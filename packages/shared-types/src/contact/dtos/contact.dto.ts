import { createZodDto } from '../../utils'
import {
  createContactSchema,
  updateContactSchema,
  queryContactSchema,
  contactSchema,
} from '../schemas'

/**
 * 创建联系人 DTO
 */
export class CreateContactDto extends createZodDto(createContactSchema) {}

/**
 * 更新联系人 DTO
 */
export class UpdateContactDto extends createZodDto(updateContactSchema) {}

/**
 * 查询联系人 DTO
 */
export class QueryContactDto extends createZodDto(queryContactSchema) {}

/**
 * 联系人实体 DTO
 */
export class ContactDto extends createZodDto(contactSchema) {}

// 导出关联的 Schema 供外部使用
export {
  createContactSchema,
  updateContactSchema,
  queryContactSchema,
  contactSchema,
} from '../schemas'
