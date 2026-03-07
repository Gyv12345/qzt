import { z } from 'zod'

/**
 * 文件类型枚举
 */
export const fileTypeSchema = z.enum(['IMAGE', 'DOCUMENT', 'VIDEO', 'OTHER'], {
  message: '文件类型必须是 IMAGE、DOCUMENT、VIDEO 或 OTHER',
})

export type FileType = z.infer<typeof fileTypeSchema>

/**
 * 上传文件 Schema
 */
export const uploadFileSchema = z.object({
  fileName: z.string().min(1, '文件名不能为空'),
  fileContent: z.string().min(1, '文件内容不能为空'), // Base64
  fileType: fileTypeSchema.optional(),
  mimeType: z.string().optional(),
})

export type UploadFile = z.infer<typeof uploadFileSchema>

/**
 * 上传 URL Schema
 */
export const uploadUrlSchema = z.object({
  fileName: z.string().min(1, '文件名不能为空'),
  mimeType: z.string().optional(),
})

export type UploadUrl = z.infer<typeof uploadUrlSchema>

/**
 * 上传响应 Schema
 */
export const uploadResponseSchema = z.object({
  url: z.string(),
  fileName: z.string(),
  size: z.number().optional(),
  mimeType: z.string().optional(),
})

export type UploadResponse = z.infer<typeof uploadResponseSchema>

/**
 * 文件信息 Schema
 */
export const fileInfoSchema = z.object({
  id: z.string().cuid(),
  fileName: z.string(),
  url: z.string(),
  size: z.number().optional(),
  mimeType: z.string().optional(),
  fileType: fileTypeSchema.optional(),
  createdAt: z.coerce.date(),
})

export type FileInfo = z.infer<typeof fileInfoSchema>
