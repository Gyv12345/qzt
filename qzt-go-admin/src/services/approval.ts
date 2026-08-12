import request from '../utils/request'
import type {
  ApprovalFlow,
  ApprovalFlowDetail,
  ApprovalFlowPayload,
  ApprovalInstance,
  ApprovalInstanceDetail,
  ApprovalRecord,
  ApprovalTask,
  FormField,
  SaveDesignRequest,
} from '../types/approval'
import type { PageParams } from '../types'

/** 审批模块分页结构(与 CRM 相同,只有 list+total) */
export interface ApprovalPageResult<T> {
  list: T[]
  total: number
}

// ---------- 审批流程 ----------

export const listApprovalFlows = (params?: PageParams) =>
  request.get<unknown, ApprovalPageResult<ApprovalFlow>>('/approval/flows', { params })

/** 按表单类型获取审批流程(不存在则自动创建预置流程);formKey 仅 OA_CUSTOM 按模板细分 */
export const getFlowByFormType = (formType: string, formKey?: string) =>
  request.get<unknown, ApprovalFlow>('/approval/flows/by-type', {
    params: { form_type: formType, ...(formKey ? { form_key: formKey } : {}) },
  })

export const getApprovalFlow = (id: number) =>
  request.get<unknown, ApprovalFlowDetail>(`/approval/flows/${id}`)

export const createApprovalFlow = (data: ApprovalFlowPayload) =>
  request.post('/approval/flows', data)

/** 启用/禁用流程 */
export const setApprovalFlowEnable = (id: number, enable: number) =>
  request.put(`/approval/flows/${id}/enable`, { enable })

/** 保存流程设计(节点图,每次保存创建新版本) */
export const saveApprovalFlowDesign = (id: number, data: SaveDesignRequest) =>
  request.put(`/approval/flows/${id}/design`, data)

/** 审批条件字段元数据(固定+自定义,供流程设计器条件下拉用);formKey 仅 OA_CUSTOM 按模板 */
export const getFormFields = (formType: string, formKey?: string) =>
  request.get<unknown, { fields: FormField[] }>('/approval/flows/form-fields', {
    params: { form_type: formType, ...(formKey ? { form_key: formKey } : {}) },
  })

// ---------- 审批实例 ----------

export const listMyTodos = (params?: PageParams) =>
  request.get<unknown, ApprovalPageResult<ApprovalTask>>('/approval/todos', { params })

export const listMyProcessed = (params?: PageParams) =>
  request.get<unknown, ApprovalPageResult<ApprovalRecord>>('/approval/processed', { params })

export const listMyInitiated = (params?: PageParams) =>
  request.get<unknown, ApprovalPageResult<ApprovalInstance>>('/approval/initiated', { params })

export const getApprovalInstance = (id: number) =>
  request.get<unknown, ApprovalInstanceDetail>(`/approval/instances/${id}`)

/** 撤回审批(无请求体) */
export const revokeApprovalInstance = (id: number) =>
  request.put(`/approval/instances/${id}/revoke`)

// ---------- 审批操作 ----------

export const approveTask = (taskId: number, comment?: string) =>
  request.post('/approval/actions/approve', { task_id: taskId, comment })

export const rejectTask = (taskId: number, comment: string) =>
  request.post('/approval/actions/reject', { task_id: taskId, comment })

/** 提交审批 */
export const pushApproval = (data: {
  form_type: string
  resource_id: number
  comment?: string
  execute_timing?: string
}) => request.post('/approval/actions/push', data)
