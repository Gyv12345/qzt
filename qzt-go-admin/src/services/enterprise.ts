import request from '../utils/request'
import type {
  EntJob,
  EntJobLog,
  EntJobPayload,
  EntMessage,
  EntMessagePayload,
  EntNotice,
  EntNoticePayload,
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

// ---------- 公告 ----------

export interface NoticeQuery extends PageParams {
  title?: string
  /** 1 通知 2 公告 */
  type?: number
  /** 0 草稿 1 发布 */
  status?: number
}

export const listNotices = (params?: NoticeQuery) =>
  request.get<unknown, EntPageResult<EntNotice>>('/enterprise/notices', { params })

export const getNotice = (id: number) => request.get<unknown, EntNotice>(`/enterprise/notices/${id}`)

export const createNotice = (data: EntNoticePayload) => request.post('/enterprise/notices', data)

export const updateNotice = (id: number, data: EntNoticePayload) =>
  request.put(`/enterprise/notices/${id}`, data)

export const deleteNotice = (id: number) => request.delete(`/enterprise/notices/${id}`)

/** 发布公告(无请求体) */
export const publishNotice = (id: number) => request.put(`/enterprise/notices/${id}/publish`)

/** 撤回公告(无请求体) */
export const withdrawNotice = (id: number) => request.put(`/enterprise/notices/${id}/withdraw`)

/** 首页公告流 */
export const getNoticeFeed = (limit = 5) =>
  request.get<unknown, EntNotice[]>('/enterprise/notices/feed', { params: { limit } })

/** 已发布公告 */
export const listPublishedNotices = (params?: { type?: number; limit?: number }) =>
  request.get<unknown, EntNotice[]>('/enterprise/notices/published', { params })
