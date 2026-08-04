// 审批中心 API 契约类型,与 qzt-go-server swagger 定义保持一致

/** 审批流程 */
export interface ApprovalFlow {
  id: number
  current_version_id: number
  number: string
  name: string
  /** 表单类型,如 CONTRACT */
  form_type: string
  create_execute: number
  update_execute: number
  submitter_can_revoke: number
  allow_batch_process: number
  allow_withdraw: number
  allow_add_sign: number
  duplicate_approver_rule: string
  require_comment: number
  /** 1 启用 0 禁用 */
  enable: number
  status_permissions: string
  description: string
  created_at: string
  updated_at: string
}

/** 创建审批流程请求 */
export interface ApprovalFlowPayload {
  name: string
  form_type: string
  number?: string
  enable?: number
}

/** 流程节点 */
export interface ApprovalFlowNode {
  id: number
  flow_version_id: number
  number: string
  name: string
  /** START / APPROVER / END */
  node_type: string
  execute_timing: string
  sort: number
  created_at: string
  updated_at: string
}

/** 节点审批人配置 */
export interface ApprovalApprover {
  id: number
  flow_version_id: number
  approval_type: string
  multi_approver_mode: string
  empty_approver_action: string
  fallback_approver: number | null
  same_submitter_action: string
  approver_type: string
  approver_direction: string
  cc_type: string
  cc_list: string
  /** JSON 字符串,如 "[1]" */
  approver_list: string
  pass_post_config: string
  reject_post_config: string
  field_permissions: string
  created_at: string
  updated_at: string
}

/** 节点连线 */
export interface ApprovalLink {
  id: number
  flow_version_id: number
  from_node_id: number
  to_node_id: number
  sort: number
  created_at: string
  updated_at: string
}

/** 流程详情(含设计) */
export interface ApprovalFlowDetail extends ApprovalFlow {
  nodes: ApprovalFlowNode[] | null
  approvers: ApprovalApprover[] | null
  conditions: unknown
  links: ApprovalLink[] | null
}

/** 审批状态 */
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED' | string

/** 审批实例 */
export interface ApprovalInstance {
  id: number
  flow_version_id: number
  /** 表单类型,如 CONTRACT */
  type: string
  resource_id: number
  submitter_id: number
  current_node_id: number
  approval_status: ApprovalStatus
  submit_time: string
  approval_time: string
  execute_timing: string
  comment: string
  update_fields: string
  created_at: string
  updated_at: string
}

/** 待办任务(我的待办列表项) */
export interface ApprovalTask {
  id: number
  instance_id: number
  node_id: number
  node_round: number
  approver_id?: number
  status?: string
  created_at: string
  updated_at: string
  /** 列表接口可能附带实例信息 */
  instance?: ApprovalInstance
}

/** 审批操作记录 */
export interface ApprovalRecord {
  id: number
  instance_id: number
  task_id: number
  node_id: number
  node_round: number
  /** APPROVE / REJECT */
  result: string
  comment: string
  created_at: string
  updated_at: string
}

/** 审批实例详情 */
export interface ApprovalInstanceDetail extends ApprovalInstance {
  tasks: ApprovalTask[] | null
  records: ApprovalRecord[] | null
}
