// workflow.ts 自动化工作流 service(P27)。service 层是唯一直接发请求的地方。
import request from '../utils/request'
import type { ActionItem, EventItem, PageResult, WorkflowDefinition, WorkflowRun } from '../types/workflow'

// 列表(关键词/触发类型/启用过滤)
export function listDefinitions(params: {
  page?: number
  page_size?: number
  keyword?: string
  trigger_type?: string
  enabled?: number
}) {
  return request.get<unknown, PageResult<WorkflowDefinition>>('/workflow/definitions', { params })
}

export function getDefinition(id: number) {
  return request.get<unknown, WorkflowDefinition>(`/workflow/definitions/${id}`)
}

export function createDefinition(data: Partial<WorkflowDefinition>) {
  return request.post<unknown, WorkflowDefinition>('/workflow/definitions', data)
}

export function updateDefinition(id: number, data: Partial<WorkflowDefinition>) {
  return request.put<unknown, void>(`/workflow/definitions/${id}`, data)
}

export function deleteDefinition(id: number) {
  return request.delete<unknown, void>(`/workflow/definitions/${id}`)
}

// 手动运行(同步返回执行记录;失败后端也返回 run,由调用方按响应判断)
export function runDefinition(id: number) {
  return request.post<unknown, WorkflowRun>(`/workflow/definitions/${id}/run`)
}

// 启停
export function enableDefinition(id: number, enabled: number) {
  return request.put<unknown, void>(`/workflow/definitions/${id}/enable`, { enabled })
}

export function listEvents() {
  return request.get<unknown, { events: EventItem[]; actions: ActionItem[] }>('/workflow/events')
}

// 执行记录
export function listRuns(params: {
  page?: number
  page_size?: number
  definition_id?: number
  status?: string
}) {
  return request.get<unknown, PageResult<WorkflowRun>>('/workflow/runs', { params })
}

export function getRun(id: number) {
  return request.get<unknown, WorkflowRun>(`/workflow/runs/${id}`)
}

export function retryRun(id: number) {
  return request.post<unknown, WorkflowRun>(`/workflow/runs/${id}/retry`)
}

export function deleteRun(id: number) {
  return request.delete<unknown, void>(`/workflow/runs/${id}`)
}
