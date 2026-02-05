import { createZodDto } from '../../utils'
import {
  uploadFileSchema,
  uploadUrlSchema,
} from '../schemas'

/**
 * 上传文件 DTO
 */
export class UploadFileDto extends createZodDto(uploadFileSchema) {}

/**
 * 上传 URL DTO
 */
export class UploadUrlDto extends createZodDto(uploadUrlSchema) {}

// 导出关联的 Schema 供外部使用
export {
  uploadFileSchema,
  uploadUrlSchema,
} from '../schemas'
