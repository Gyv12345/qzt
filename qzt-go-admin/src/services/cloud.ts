import request from '../utils/request'
import type { CloudFile } from '../types/cloud'

// ── 网盘 ──

/** 文件列表 */
export const listCloudFiles = (parentId = 0, scope = 'personal') =>
  request.get<unknown, { list: CloudFile[] }>('/cloud/files', { params: { parent_id: parentId, scope } })

/** 新建文件夹 */
export const createFolder = (data: { parent_id: number; name: string; scope?: string }) =>
  request.post<unknown, CloudFile>('/cloud/folders', data)

/** 上传文件(创建文件记录) */
export const createFile = (data: {
  parent_id: number
  name: string
  object_key?: string
  url?: string
  size?: number
  content_type?: string
  scope?: string
}) => request.post<unknown, CloudFile>('/cloud/files', data)

/** 重命名/移动 */
export const updateFile = (id: number, data: { name?: string; parent_id?: number }) =>
  request.put(`/cloud/files/${id}`, data)

/** 删除 */
export const deleteFile = (id: number) => request.delete(`/cloud/files/${id}`)

/** 个人空间用量 */
export const getUsage = () =>
  request.get<unknown, { used: number }>('/cloud/usage')
