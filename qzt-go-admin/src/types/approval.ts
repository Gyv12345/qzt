// 审批中心 API 契约类型,与 qzt-go-server swagger 定义保持一致

/** 审批流程 */
export interface ApprovalFlow {
  id: number
  current_version_id: number
  number: string
  name: string
  /** 表单类型,如 CONTRACT */
  form_type: string
  /** 表单标识(仅 OA_CUSTOM 按模板细分,空串=该类型通用流程) */
  form_key: string
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

/** 待办任务(我的待办/已办列表项) */
export interface ApprovalTask {
  id: number
  instance_id: number
  node_id: number
  node_round: number
  approver_id?: number
  /** 上一手审批人(转办让渡/委托代审留痕,委托时=原审批人) */
  delegator_id?: number | null
  status?: string
  /** 任务类型(CC抄送/SN加签/BK退回/NL常规) */
  type?: string
  /** 已办场景:该任务上我的审批动作(APPROVE/REJECT 等) */
  action?: string
  /** 加签模式(before=被加签人先审再回到发起人;after=发起人审完顺延;空=非加签任务) */
  add_sign_mode?: 'before' | 'after' | ''
  /** 加签发起人用户ID(详情接口 enrichment,可能不下发) */
  add_sign_by?: number | null
  /** 加签发起人姓名(详情接口 enrichment) */
  add_sign_by_name?: string
  created_at: string
  updated_at: string
  /** 列表接口可能附带实例信息 */
  instance?: ApprovalInstance
}

/** 可退回节点(实例详情 enrichment:当前审批人可退回的节点列表) */
export interface ReturnableNode {
  id: number
  name: string
}

/** 加签模式 */
export type AddSignMode = 'before' | 'after'

/** 加签请求 */
export interface AddSignPayload {
  task_id: number
  user_ids: number[]
  mode: AddSignMode
}

/** 退回请求 */
export interface ReturnBackPayload {
  task_id: number
  return_to_node_id: number
  comment: string
}

/** 审批操作记录 */
export interface ApprovalRecord {
  id: number
  instance_id: number
  task_id: number
  node_id: number
  node_round: number
  /** APPROVE / REJECT / AUTO_PASS / TRANSFER / DELEGATE */
  result: string
  comment: string
  created_at: string
  updated_at: string
}

// ── 实例流程图(轨迹可视化) ──

/** 实例流程图节点(后端已解析审批人展示文本) */
export interface ApprovalInstanceGraphNode {
  id: number
  number: string
  name: string
  /** START / APPROVER / CONDITION / DEFAULT / END */
  node_type: string
  /** 审批人展示文本(MEMBER 已解析昵称,其余为类型标签) */
  approver_text: string
}

/** 实例流程图连线 */
export interface ApprovalInstanceGraphLink {
  id: number
  flow_version_id: number
  from_node_id: number
  to_node_id: number
  sort: number
}

/** 实例流程图(按实例绑定的流程版本取图,附加轨迹) */
export interface ApprovalInstanceGraph {
  flow_id: number
  flow_name: string
  flow_version_id: number
  approval_status: string
  /** 当前节点(审批中才有) */
  current_node_id: number | null
  /** 已走过的节点(任务+记录去重) */
  visited_node_ids: number[] | null
  nodes: ApprovalInstanceGraphNode[] | null
  links: ApprovalInstanceGraphLink[] | null
}

/** 转办/委托模式 */
export type TransferMode = 'TRANSFER' | 'DELEGATE'

/** 转办/委托请求 */
export interface TransferPayload {
  task_id: number
  target_user_id: number
  /** TRANSFER(默认)/DELEGATE */
  mode?: TransferMode
  comment?: string
}

/** 审批实例详情 */
export interface ApprovalInstanceDetail extends ApprovalInstance {
  resource_title?: string
  form_type_label?: string
  tasks: ApprovalTask[] | null
  records: ApprovalRecord[] | null
  /** 当前审批人可退回的节点列表(详情接口 enrichment) */
  returnable_nodes?: ReturnableNode[] | null
}

// ── 原单摘要(详情抽屉展示"批的是什么") ──

/** 摘要键值字段;dict 非空时渲染前先映射字典中文 */
export interface SummaryField {
  label: string
  value: string
  dict?: string
}

/** 明细列定义 */
export interface SummaryColumn {
  key: string
  label: string
  dict?: string
}

/** 明细行(报销明细/单据商品行等) */
export interface SummaryItems {
  title: string
  columns: SummaryColumn[]
  rows: Record<string, string>[]
}

/** 原单摘要 */
export interface ResourceSummary {
  form_type: string
  form_type_label: string
  resource_id: number
  title: string
  /** 原单是否存在(未接入的类型/已删除的单据为 false) */
  found: boolean
  fields: SummaryField[]
  items?: SummaryItems
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

// ── 审批条件字段元数据(流程设计器条件配置用) ──

/** 条件字段类型 */
export type FormFieldType = 'number' | 'date' | 'enum' | 'string'

/** 条件字段来源(前端分组展示) */
export type FormFieldSource = 'fixed' | 'custom'

/** 枚举选项 */
export interface FieldOption {
  label: string
  value: string
}

/** 条件字段元数据(后端 GET /approval/flows/form-fields 返回) */
export interface FormField {
  /** 固定字段=列名;CRM自定义=field_id;OA_CUSTOM=字段key */
  key: string
  label: string
  type: FormFieldType
  source: FormFieldSource
  options?: FieldOption[]
}
