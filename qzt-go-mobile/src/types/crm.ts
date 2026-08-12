// CRM 模块类型(移动端子集),与 qzt-go-server crm 模型对齐
// 金额(decimal)为字符串;可空字段为 null

/** 客户状态: 1正常 2冻结 3流失 */
export interface CrmCustomer {
  id: number
  name: string
  customer_no: string
  /** 客户级别 A/B/C */
  level: string
  /** 客户来源 */
  source: string
  /** 行业 */
  industry: string
  status: number
  /** 负责人, null=公海 */
  owner_id: number | null
  follower_id: number | null
  follow_time: string | null
  /** 0私海 1公海 */
  in_pool: number
  pool_id: number | null
  created_at: string
  updated_at: string
}

export interface CrmContact {
  id: number
  customer_id: number
  name: string
  phone: string
  email: string
  position: string
  department: string
  is_key_decision_maker: number
  status: number
  remark: string
  created_at: string
  updated_at: string
}

/** 客户详情(含联系人) */
export interface CrmCustomerDetail {
  customer: CrmCustomer
  contacts?: CrmContact[]
  /** 自定义字段值 field_id -> value */
  fields?: Record<string, string>
}

// ── 线索 ──

/** 线索状态: 1新建 2跟进中 3已转化 4无效 */
export interface CrmLead {
  id: number
  name: string
  lead_no: string
  contact_name: string
  phone: string
  email: string
  company: string
  /** 级别, 字典 LEAD_LEVEL */
  level: string
  /** 来源, 字典 LEAD_SOURCE */
  source: string
  status: number
  /** 行业, 字典 INDUSTRY */
  industry: string
  /** 负责人, null=公海 */
  owner_id: number | null
  follower_id: number | null
  follow_time: string | null
  /** 0私海 1公海 */
  in_pool: number
  pool_id: number | null
  collection_time: string | null
  pool_reason: string
  converted_customer_id: number | null
  converted_at: string | null
  created_at: string
  updated_at: string
}

// ── 查重(跨线索+客户) ──

export interface DedupLeadItem {
  id: number
  name: string
  contact_name: string
  phone: string
  company: string
  status: number
  owner_id: number | null
}

export interface DedupCustomerItem {
  id: number
  name: string
  customer_no: string
  status: number
  owner_id: number | null
}

export interface DedupResult {
  leads: DedupLeadItem[]
  customers: DedupCustomerItem[]
}

/** 商机阶段:PROSPECTING/QUALIFIED/PROPOSAL/NEGOTIATION/WON/LOST */
export interface CrmOpportunity {
  id: number
  name: string
  opportunity_no: string
  customer_id: number
  /** 关联客户名(列表接口可能附带) */
  customer_name?: string
  /** 预计金额(decimal 字符串) */
  expected_amount: string
  expected_close_date: string | null
  stage: string
  probability: number | null
  owner_id: number | null
  description: string
  created_at: string
  updated_at: string
}

/** 阶段定义(stage-config 中的单个阶段) */
export interface StageDef {
  key: string
  label: string
  color?: string
  sort?: number
  probability?: number
}

/** 阶段配置(GET /crm/stage-configs/:bizType 返回) */
export interface StageConfig {
  config?: unknown
  stages: StageDef[]
}

/** 阶段变更历史记录 */
export interface StageRecord {
  id: number
  from_stage: string
  to_stage: string
  operator_id: number
  reason: string
  created_at: string
}

/** 合同阶段:DRAFT/EXECUTING/COMPLETED/TERMINATED */
export interface CrmContract {
  id: number
  contract_no: string
  name: string
  customer_id: number
  customer_name?: string
  /** 合同总额(decimal 字符串) */
  total_amount: string
  /** 已回款(decimal 字符串) */
  received_amount: string
  signed_date: string | null
  start_date: string | null
  end_date: string | null
  stage: string
  /** 审批批状态:NONE/PROCESSING/APPROVED/REJECTED/REVOKED */
  approval_status: string
  owner_id: number | null
  content: string
  created_at: string
  updated_at: string
}

// ── 产品 ──

export interface CrmProduct {
  id: number
  product_no: string
  name: string
  category: string
  spec: string
  unit: string
  price: string
  description: string
  status: number
}

// ── 售后工单 ──

export interface CrmTicket {
  id: number
  ticket_no: string
  title: string
  description: string
  customer_id: number | null
  customer_name: string
  contact_name: string
  contact_phone: string
  category: string
  priority: number
  status: number
  handler_id: number | null
  solution: string
  resolved_at: string | null
  created_at: string
}

export interface CrmTicketLog {
  id: number
  ticket_id: number
  content: string
  operator_id: number
  old_status: number
  new_status: number
  created_at: string
}

export interface TicketDetail {
  ticket: CrmTicket
  logs: CrmTicketLog[]
}

export const TICKET_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '待处理', color: 'danger' },
  2: { text: '处理中', color: 'warning' },
  3: { text: '已解决', color: 'success' },
  4: { text: '已关闭', color: 'default' },
  5: { text: '已重开', color: 'warning' },
}

// ── 跟进记录 ──

export interface FollowUpRecord {
  id: number
  follow_no: string
  type: string
  content: string
  follow_time: string
  owner_id: number
  customer_id: number | null
  lead_id: number | null
  created_at: string
}

/** 跟进方式选项(与后端字典一致) */
export const FOLLOW_TYPES = [
  { label: '微信', value: 'WECHAT' },
  { label: '电话', value: 'PHONE' },
  { label: '拜访', value: 'VISIT' },
  { label: '邮件', value: 'EMAIL' },
  { label: '其他', value: 'OTHER' },
] as const

/** 跟进计划(待办) */
export interface CrmFollowPlan {
  id: number
  type: string
  content: string
  plan_time: string
  remind_time: string | null
  owner_id: number
  /** 0待办 1已转记录 2已跳过 */
  status: number
  reminded: number
  record_id: number | null
  customer_id: number | null
  lead_id: number | null
  opportunity_id: number | null
  contact_id: number | null
  contract_id: number | null
  created_at: string
}

/** 跟进方式 → 中文 */
export const FOLLOW_TYPE_TEXT: Record<string, string> = {
  WECHAT: '微信',
  PHONE: '电话',
  VISIT: '拜访',
  EMAIL: '邮件',
  OTHER: '其他',
}

/** 创建跟进记录请求 */
export interface CreateFollowRecordPayload {
  type: string
  content: string
  follow_time: string
  customer_id?: number
  lead_id?: number
}

// ── 合同回款 ──

export interface PaymentPlan {
  id: number
  contract_id: number
  plan_date: string
  plan_amount: string
  received_amount: string
  status: number // 0未回款 1部分 2已回款
  remark: string
  created_at: string
}

export interface PaymentRecord {
  id: number
  contract_id: number
  plan_id: number | null
  received_date: string
  amount: string
  method: string
  remark: string
  created_at: string
}

export interface PaymentSummary {
  total_amount: string
  received_amount: string
  plans: PaymentPlan[]
}

export const PAYMENT_METHODS = [
  { label: '银行转账', value: '银行转账' },
  { label: '微信', value: '微信' },
  { label: '支付宝', value: '支付宝' },
  { label: '现金', value: '现金' },
] as const

export const PAYMENT_PLAN_STATUS: Record<number, { text: string; color: string }> = {
  0: { text: '未回款', color: 'default' },
  1: { text: '部分', color: 'warning' },
  2: { text: '已回款', color: 'success' },
}

// ── OA 公告 ──

export interface OaNotice {
  id: number
  title: string
  content: string
  type: number // 1通知 2公告
  status: number // 0草稿 1发布
  publish_time: string
  created_at: string
}

// ── 自定义字段定义(与 admin 对齐) ──

export interface CrmCustomField {
  id: string
  form_id: string
  internal_key: string
  name: string
  type: string
  mobile: number
  pos: number
  readable: number
  editable: number
  convert_target_field?: string
  /** 大属性 JSON(选项等),仅 BLOB 类型有 */
  prop?: string
}

/** 从 prop 解析选项(多选/单选),失败返回 null */
export function parseFieldOptions(field: CrmCustomField): { label: string; value: string }[] | null {
  if (!field.prop) return null
  try {
    const parsed = JSON.parse(field.prop)
    const arr = Array.isArray(parsed) ? parsed : parsed.options
    if (!Array.isArray(arr) || arr.length === 0) return null
    return arr.map((item: any) => {
      if (item && typeof item === 'object') {
        return { label: String(item.label ?? item.value ?? ''), value: String(item.value ?? item.label ?? '') }
      }
      return { label: String(item), value: String(item) }
    })
  } catch {
    return null
  }
}

/** 多选类型 */
export function isMultipleFieldType(type: string): boolean {
  return type === 'SELECT_MULTIPLE' || type === 'CHECKBOX'
}
