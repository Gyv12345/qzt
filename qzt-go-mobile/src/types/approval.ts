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
export interface ApprovalInstanceDetail {
  ApprovalInstance: ApprovalInstance
  tasks: ApprovalTask[]
  records: ApprovalRecord[]
}

export interface ApprovalActionPayload {
  task_id: number
  comment?: string
}
