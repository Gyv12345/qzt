// 企业应用(定时任务/消息/公告) API 契约类型,与 qzt-go-server swagger 定义保持一致

/** 定时任务 */
export interface EntJob {
  id: number
  job_name: string
  job_group: string
  /** 处理器 Bean 名称 */
  bean_class: string
  cron_expression: string
  /** 1 启用 0 停用 */
  status: number
  remark: string
  last_run_time?: string
  next_run_time?: string
  created_at: string
  updated_at: string
}

/** 创建/更新定时任务请求 */
export interface EntJobPayload {
  job_name: string
  bean_class: string
  cron_expression: string
  job_group?: string
  status?: number
  remark?: string
}

/** 任务执行日志 */
export interface EntJobLog {
  id: number
  job_id: number
  job_name?: string
  bean_class?: string
  /** 执行结果状态 */
  status?: number
  message?: string
  error?: string
  /** 耗时(毫秒) */
  cost?: number
  execute_time?: string
  created_at: string
  updated_at?: string
}

/** 站内消息 */
export interface EntMessage {
  id: number
  sender_id: number
  receiver_id: number
  title: string
  content: string
  /** 1 已读 0 未读 */
  is_read?: number
  read_time?: string
  created_at: string
  updated_at?: string
}

/** 发送消息请求 */
export interface EntMessagePayload {
  receiver_id: number
  title: string
  content: string
}

// 公告已迁移到 OA 模块,见 types/oa.ts (OaNotice)

