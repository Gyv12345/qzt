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
