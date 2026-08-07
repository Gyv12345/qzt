import request from '../utils/request'
import type {
  Attachment,
  CreateAttachmentRequest,
  SignResult,
  UploadResult,
  UploadSTSResult,
} from '../types/attachment'

// ---------- 通用附件(多态: biz_type + resource_id) ----------

/** 查询某业务实体的附件列表 */
export const listAttachments = (bizType: string, resourceId: number) =>
  request.get<unknown, Attachment[]>('/api/attachments', {
    params: { biz_type: bizType, resource_id: resourceId },
  })

/** 创建附件记录(前端上传文件后调用,落库元数据) */
export const createAttachment = (data: CreateAttachmentRequest) =>
  request.post<unknown, Attachment>('/api/attachments', data)

/** 删除附件记录(仅上传人或超管) */
export const deleteAttachment = (id: number) => request.delete(`/api/attachments/${id}`)

// ---------- 文件上传(双桶) ----------

/**
 * 后端代理上传(driver=local 或回退时使用)。
 * visibility=private 时上传到私有桶,返回的 url 为 objectKey。
 */
export const uploadFile = (
  file: File,
  folder: string,
  visibility: 'public' | 'private' = 'public',
) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', folder)
  return request.post<unknown, UploadResult>('/api/upload', formData, {
    params: { visibility },
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

/**
 * 获取 OSS 直传预签名 URL。
 * private=true 时给私有桶签名,返回的 file_url 为 objectKey。
 */
export const getUploadSTS = (
  filename: string,
  folder: string,
  visibility: 'public' | 'private' = 'public',
) =>
  request.get<unknown, UploadSTSResult>('/api/upload/sts', {
    params: { filename, folder, private: visibility === 'private' },
  })

// ---------- 私有文件签名下载 ----------

/** 为私有文件签发短期(1h)下载 URL */
export const signFileURL = (key: string) =>
  request.get<unknown, SignResult>('/api/file/sign', { params: { key } })
