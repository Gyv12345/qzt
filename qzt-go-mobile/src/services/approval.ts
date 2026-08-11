import request from '../utils/request'
import type { PageParams } from '../types'
import type {
  ApprovalActionPayload,
  ApprovalInstance,
  ApprovalInstanceDetail,
} from '../types/approval'

interface ApprovalPageResult<T> {
  list: T[]
  total: number
}

export interface TodoQuery extends PageParams {}

/** 待办列表 */
export const listTodos = (params: TodoQuery) =>
  request.get<unknown, ApprovalPageResult<ApprovalInstance>>('/approval/todos', { params })

/** 已办列表 */
export const listProcessed = (params: TodoQuery) =>
  request.get<unknown, ApprovalPageResult<ApprovalInstance>>('/approval/processed', { params })

/** 我发起的 */
export const listInitiated = (params: TodoQuery) =>
  request.get<unknown, ApprovalPageResult<ApprovalInstance>>('/approval/initiated', { params })

/** 审批实例详情 */
export const getInstance = (id: number) =>
  request.get<unknown, ApprovalInstanceDetail>(`/approval/instances/${id}`)

/** 通过 */
export const approve = (payload: ApprovalActionPayload) =>
  request.post('/approval/actions/approve', payload)

/** 驳回 */
export const reject = (payload: ApprovalActionPayload) =>
  request.post('/approval/actions/reject', payload)

/** 撤回 */
export const revoke = (id: number) => request.put(`/approval/instances/${id}/revoke`)

/** 发起审批(form_type: CONTRACT/EXPENSE/LEAVE/TRIP/LOAN 等;resource_id 业务单据ID) */
export const pushApproval = (formType: string, resourceId: number, comment?: string) =>
  request.post('/approval/actions/push', { form_type: formType, resource_id: resourceId, comment })
