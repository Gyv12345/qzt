import request from '../utils/request'
import type {
  EntJob,
  EntJobLog,
  EntJobPayload,
  EntMessage,
  EntMessagePayload,
} from '../types/enterprise'
import type { ContactSyncResultRaw, ContactSyncStatus, PageParams } from '../types'

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

// ---------- 通讯录同步(钉钉/飞书,超管手动触发,异步 job) ----------

/** 触发指定平台通讯录同步(异步执行,结果以 /contact-sync/status 为准) */
export const triggerContactSync = (platform: 'dingtalk' | 'feishu') =>
  request.post(`/enterprise/contact-sync/${platform}`)

/**
 * 各平台通讯录同步状态:后端按平台拆两条(P32 契约),此处并行取两条并映射为页面统一形态;
 * 未同步过/未配置的平台按缺失处理(Promise.allSettled 吞失败),卡片保持「尚未同步」。
 */
export const getContactSyncStatus = async (): Promise<ContactSyncStatus[]> => {
  const results = await Promise.allSettled([
    request.get<unknown, ContactSyncResultRaw>('/enterprise/contact-sync/dingtalk/status', { silent: true }),
    request.get<unknown, ContactSyncResultRaw>('/enterprise/contact-sync/feishu/status', { silent: true }),
  ])
  return results.flatMap((r) => (r.status === 'fulfilled' ? [mapContactSyncResult(r.value)] : []))
}

/** 后端 SyncResult 统计摘要 → 页面 ContactSyncStatus(标签颜色/时间/摘要小字) */
const mapContactSyncResult = (raw: ContactSyncResultRaw): ContactSyncStatus => {
  const failed = Boolean(raw.error)
  const summary = failed
    ? raw.error!
    : [
        raw.depts_created + raw.depts_updated + raw.depts_disabled > 0
          ? `部门:新增${raw.depts_created}/更新${raw.depts_updated}/停用${raw.depts_disabled}`
          : '',
        `成员:新增${raw.users_created}/更新${raw.users_updated}/绑定${raw.users_bound}/停用${raw.users_disabled}`,
        raw.op_errors > 0 ? `异常${raw.op_errors} 项` : '',
      ]
        .filter(Boolean)
        .join('，')
  return {
    platform: raw.platform,
    last_run_time: raw.finished_at,
    status: failed ? 'failed' : 'success',
    summary,
  }
}
