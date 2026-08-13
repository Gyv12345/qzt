import request from '../utils/request'

export interface UploadResult {
  url: string
  object_key?: string
  filename?: string
  size?: number
}

/** 通用文件上传(POST /api/upload,multipart) */
export const uploadFile = (file: File) => {
  const form = new FormData()
  form.append('file', file)
  return request.post<unknown, UploadResult>('/api/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
