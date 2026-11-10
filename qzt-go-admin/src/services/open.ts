// services/open.ts 开放集成 service 层(唯一直接发请求处)。
import request from '../utils/request'
import type { PageParams, PageResult } from '../types'
import type { OpenWebhook, OpenWebhookEvent, OpenEventInfo } from '../types/open'

export interface WebhookPayload {
  name: string
  url: string
  events: string
  status?: number
  remark?: string
}

// ---------- Webhook 配置 ----------

export const listWebhooks = () =>
  request.get<unknown, { list: OpenWebhook[]; total: number }>('/open/webhooks')

export const createWebhook = (data: {
  name: string
  url: string
  events: string
  status?: number
  remark?: string
}) => request.post<unknown, { webhook: OpenWebhook; secret: string }>('/open/webhooks', data)

export const updateWebhook = (id: number, data: WebhookPayload) =>
  request.put(`/open/webhooks/${id}`, data)

export const deleteWebhook = (id: number) => request.delete(`/open/webhooks/${id}`)

export const setWebhookStatus = (id: number, status: number) =>
  request.put(`/open/webhooks/${id}/status`, { status })

// ---------- 投递日志 ----------

export interface OpenEventQuery extends PageParams {
  webhook_id?: number
  event_type?: string
  status?: number
  start?: string
  end?: string
}

export const listWebhookEvents = (params?: OpenEventQuery) =>
  request.get<unknown, PageResult<OpenWebhookEvent>>('/open/webhook-events', { params })

export const retryWebhookEvent = (id: number) =>
  request.post(`/open/webhook-events/${id}/retry`)

// ---------- 开放 API ----------

export const listOpenEvents = () => request.get<unknown, OpenEventInfo[]>('/open/v1/events')
