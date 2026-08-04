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
