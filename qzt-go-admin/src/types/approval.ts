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
  /** 1 系统预置 0 用户创建 */
  is_preset: number
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
  /** 资源标题(后端enrichment) */
  resource_title?: string
  /** 表单类型中文(后端enrichment) */
  form_type_label?: string
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
  resource_title?: string
  form_type_label?: string
  tasks: ApprovalTask[] | null
  records: ApprovalRecord[] | null
}

// ── 流程设计(SaveDesign)相关类型 ──

/** 节点设计(用 number 作为前端标识,links 引用它) */
export interface NodeDesign {
  number: string
  name: string
  /** START / APPROVER / CONDITION / DEFAULT / END */
  node_type: string
  /** CREATE / UPDATE / DELETE (START 节点) */
  execute_timing?: string
  sort: number
}

/** 审批人配置设计 */
export interface ApproversDesign {
  node_number: string
  approval_type?: string
  /** ALL 会签 / ANY 或签 / SEQUENTIAL 依次 */
  multi_approver_mode?: string
  /** AUTO_PASS / ASSIGN_SPECIFIC / ASSIGN_ADMIN */
  empty_approver_action?: string
  fallback_approver?: number
  /** SKIP / ALLOW */
  same_submitter_action?: string
  /** MEMBER / ROLE / SUPERIOR / MULTIPLE_SUPERIOR / DEPT_HEAD / MULTIPLE_DEPT_HEAD */
  approver_type?: string
  approver_direction?: string
  cc_type?: string
  cc_list?: string
  /** JSON 字符串,如 "[1,2]" */
  approver_list?: string
}

/** 条件配置设计 */
export interface ConditionsDesign {
  node_number: string
  /** JSON: {"logic":"AND","conditions":[{field,op,value}]} */
  condition_config: string
}

/** 连线设计(from/to 用 node_number) */
export interface LinkDesign {
  from_node_number: string
  to_node_number: string
  sort: number
}

/** 保存流程设计请求 */
export interface SaveDesignRequest {
  nodes: NodeDesign[]
  approvers: ApproversDesign[]
  conditions: ConditionsDesign[]
  links: LinkDesign[]
}
