// workflow.ts 自动化工作流类型(P27),与后端 swagger 对齐。
export interface PageResult<T> {
  list: T[]
  total: number
}

export interface WorkflowDefinition {
  id: number
  name: string
  description: string
  trigger_type: string
  trigger_config: string
  graph: string
  enabled: number
  owner_id?: number | null
  last_run_at?: string | null
  run_count: number
  created_at?: string
  updated_at?: string
}

export interface WorkflowRun {
  id: number
  definition_id: number
  trigger_source: string
  trigger_payload: string
  status: string
  node_trace: string
  error: string
  cost_ms: number
  created_at?: string
  updated_at?: string
}

export interface EventItem {
  event: string
  label: string
  desc: string
}

export interface ActionItem {
  action: string
  label: string
  desc: string
}
