// AI 助手模块类型

/** AI Agent 定义 */
export interface AiAgent {
  id: number
  name: string
  code: string
  scene: 'script' | 'follow' | 'report' | string
  system_prompt: string
  user_prompt: string
  model: string | null
  temperature: number | null
  status: number
  sort: number
  created_at: string
  updated_at: string
}

/** 创建/更新 Agent 请求 */
export interface AiAgentPayload {
  name: string
  code?: string
  scene: string
  system_prompt: string
  user_prompt?: string
  model?: string | null
  temperature?: number | null
  status?: number
  sort?: number
}

/** 回访话术请求 */
export interface ScriptRequest {
  target_type: 'lead' | 'customer'
  target_id: number
  agent_id?: number
}

/** 回访话术结果 */
export interface ScriptResult {
  content: string
  agent: string
}

/** 跟进记录请求 */
export interface FollowRequest {
  conversation: string
  target_type?: string
  target_id?: number
  auto_save?: boolean
  follow_type?: string
}

/** 跟进记录结果 */
export interface FollowResult {
  content: string
  record: string
  saved: boolean
  record_id: number | null
  agent: string
}

/** 日报周报请求 */
export interface ReportRequest {
  period: 'day' | 'week' | 'month'
  start_date?: string
  end_date?: string
}

/** 日报周报结果 */
export interface ReportResult {
  content: string
  period: string
  agent: string
}
