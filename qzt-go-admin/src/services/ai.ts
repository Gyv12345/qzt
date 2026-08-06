import request from '../utils/request'
import type {
  AiAgent,
  AiAgentPayload,
  ScriptRequest,
  ScriptResult,
  FollowRequest,
  FollowResult,
  ReportRequest,
  ReportResult,
} from '../types/ai'

// ---------- Agent 管理 ----------

export const listAgents = (scene?: string) =>
  request.get<unknown, { list: AiAgent[] }>('/ai/agents', { params: scene ? { scene } : {} })

export const createAgent = (data: AiAgentPayload) => request.post('/ai/agents', data)

export const updateAgent = (id: number, data: Omit<AiAgentPayload, 'code'>) =>
  request.put(`/ai/agents/${id}`, data)

export const deleteAgent = (id: number) => request.delete(`/ai/agents/${id}`)

// ---------- Agent 调用 ----------

/** 回访话术 */
export const generateScript = (data: ScriptRequest) =>
  request.post<unknown, ScriptResult>('/ai/chat/script', data)

/** 跟进记录 */
export const generateFollow = (data: FollowRequest) =>
  request.post<unknown, FollowResult>('/ai/chat/follow', data)

/** 日报周报 */
export const generateReport = (data: ReportRequest) =>
  request.post<unknown, ReportResult>('/ai/chat/report', data)
