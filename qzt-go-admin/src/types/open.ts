// open.ts 开放集成(webhook)类型定义,与后端 swagger 对齐。
export interface OpenWebhook {
  id: number
  name: string
  url: string
  events: string
  status: number
  remark?: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface OpenWebhookEvent {
  id: number
  webhook_id: number
  event_type: string
  payload: string
  status: number
  retry_count: number
  max_retries: number
  next_retry_at?: string
  last_http_status?: number
  last_error?: string
  delivered_at?: string
  created_at: string
}

export interface OpenEventInfo {
  code: string
  name: string
  desc: string
}
