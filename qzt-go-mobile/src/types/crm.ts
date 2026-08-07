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
