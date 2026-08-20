// 审批模块类型(移动端子集),与 qzt-go-server approval 模型对齐

/** 审批状态: PENDING/APPROVING/APPROVED/REJECTED/REVOKED */
export interface ApprovalInstance {
  id: number
  flow_version_id: number
  /** 表单类型 CONTRACT/QUOTATION/... */
  type: string
  resource_id: number
  submitter_id: number
  current_node_id: number | null
  /** PENDING/APPROVING/APPROVED/... */
  approval_status: string
  submit_time: string
  approval_time: string
  comment: string
  created_at: string
  updated_at: string
  /** 业务单据标题(后端 enrichment,如「办公用品领用 BD20260813001」) */
  resource_title?: string
  /** 表单类型中文名(后端 enrichment) */
  form_type_label?: string
}

export interface ApprovalTask {
  id: number
  node_id: number
  node_round: number
  instance_id: number
  approver_id: number
  /** PENDING/APPROVING/APPROVED/UNAPPROVED/REVOKED */
  status: string
  type: string
  action: string
  created_at: string
  updated_at: string
}

export interface ApprovalRecord {
  id: number
  instance_id: number
  task_id: number | null
  node_id: number
  node_round: number
  /** 审批结果 */
  result: string
  comment: string
  created_at: string
}

/** 审批实例详情(含任务与记录) */
/** 待办/已办列表项:审批任务,instance 嵌套所属实例(含 enrichment) */
export interface ApprovalTaskItem extends ApprovalTask {
  instance?: ApprovalInstance | null
}

/** 审批实例详情(后端扁平返回:实例字段 + resource_title/form_type_label + tasks/records) */
export interface ApprovalInstanceDetail extends ApprovalInstance {
  tasks: ApprovalTask[]
  records: ApprovalRecord[]
}

export interface ApprovalActionPayload {
  task_id: number
  comment?: string
}
