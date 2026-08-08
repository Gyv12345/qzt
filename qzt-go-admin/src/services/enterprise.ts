import request from '../utils/request'
import type {
  EntJob,
  EntJobLog,
  EntJobPayload,
  EntMessage,
  EntMessagePayload,
} from '../types/enterprise'
import type { PageParams } from '../types'

/** 企业应用分页结构(与 CRM 相同,只有 list+total) */
export interface EntPageResult<T> {
  list: T[]
  total: number
}

// ---------- 定时任务 ----------

export const listJobs = (params?: PageParams) =>
  request.get<unknown, EntPageResult<EntJob>>('/enterprise/jobs', { params })

export const createJob = (data: EntJobPayload) => request.post('/enterprise/jobs', data)

export const updateJob = (id: number, data: EntJobPayload) =>
  request.put(`/enterprise/jobs/${id}`, data)

export const deleteJob = (id: number) => request.delete(`/enterprise/jobs/${id}`)

/** 手动触发任务(无请求体) */
export const runJob = (id: number) => request.post(`/enterprise/jobs/${id}/run`)

// ---------- 任务执行日志 ----------

export interface JobLogQuery extends PageParams {
  job_id?: number
}

export const listJobLogs = (params?: JobLogQuery) =>
  request.get<unknown, EntPageResult<EntJobLog>>('/enterprise/job-logs', { params })

// ---------- 站内消息 ----------

export const listInbox = (params?: PageParams) =>
  request.get<unknown, EntPageResult<EntMessage>>('/enterprise/messages/inbox', { params })

export const listOutbox = (params?: PageParams) =>
  request.get<unknown, EntPageResult<EntMessage>>('/enterprise/messages/outbox', { params })

export const getMessage = (id: number) =>
  request.get<unknown, EntMessage>(`/enterprise/messages/${id}`)

export const sendMessage = (data: EntMessagePayload) => request.post('/enterprise/messages', data)

export const deleteMessage = (id: number) => request.delete(`/enterprise/messages/${id}`)

export const markMessageRead = (id: number) => request.put(`/enterprise/messages/${id}/read`)

export const markMessagesRead = (ids: number[]) =>
  request.put('/enterprise/messages/read-batch', { ids })

export const markAllMessagesRead = () => request.put('/enterprise/messages/read-all')

export const getUnreadCount = () =>
  request.get<unknown, { unread_count: number }>('/enterprise/messages/unread-count')

// 公告已迁移到 OA 模块,见 services/oa.ts
