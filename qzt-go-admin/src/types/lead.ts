// CRM 线索模块类型,与 qzt-go-server internal/model/crm/lead.go 对齐
import type { CrmFieldValue } from './crm'

/** 线索状态: 1新建 2跟进中 3已转化 4无效(字典 LEAD_STATUS) */
export interface CrmLead {
  id: number
  name: string
  lead_no: string
  contact_name: string
  phone: string
  email: string
  company: string
  /** 线索级别(字典 LEAD_LEVEL: A/B/C) */
  level: string
  /** 线索来源(字典 LEAD_SOURCE) */
  source: string
  /** 1新建 2跟进中 3已转化 4无效 */
  status: number
  /** 行业(字典 INDUSTRY) */
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
  /** 转化后的客户ID, null=未转化 */
  converted_customer_id: number | null
  converted_at: string | null
  created_at: string
  updated_at: string
}

/** 线索详情(含自定义字段值,GET /crm/leads/:id 返回) */
export interface CrmLeadDetail {
  lead: CrmLead
  fields: Record<string, string>
}

/** 创建/更新线索请求 */
export interface CrmLeadPayload {
  name: string
  lead_no?: string
  contact_name?: string
  phone?: string
  email?: string
  company?: string
  level?: string
  source?: string
  status?: number
  industry?: string
  owner_id?: number
  fields?: CrmFieldValue[]
}

/** 线索归属历史 */
export interface CrmLeadOwnerHistory {
  id: number
  lead_id: number
  owner_id: number | null
  action: string // TAKE/RELEASE/TRANSFER/RECYCLE
  operator_id: number
  reason: string
  created_at: string
  updated_at: string
}

/** 线索公海池 */
export interface CrmLeadPool {
  id: number
  name: string
  scope_dept_ids: string
  scope_role_ids: string
  admin_user_ids: string
  enabled: number
  auto_recycle: number
  created_at: string
  updated_at: string
}
