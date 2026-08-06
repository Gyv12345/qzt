// CRM 模块类型,与 qzt-go-server crm 模块模型保持一致
// 注意:金额(decimal)在 JSON 中为字符串;可空字段为 null

/** 客户状态: 1正常 2冻结 3流失(字典 CUSTOMER_STATUS) */
export interface CrmCustomer {
  id: number
  name: string
  customer_no: string
  /** 客户级别(字典 CUSTOMER_LEVEL: A/B/C) */
  level: string
  /** 客户来源(字典 CUSTOMER_SOURCE) */
  source: string
  /** 行业(字典 INDUSTRY) */
  industry: string
  status: number
  /** 负责人, null=公海 */
  owner_id: number | null
  follower_id: number | null
  follow_time: string | null
  /** 0私海 1公海 */
  in_pool: number
  pool_id: number | null
  collection_time: string | null
  pool_reason: string
  created_at: string
  updated_at: string
}

/** 客户详情响应 */
export interface CrmCustomerDetail {
  customer: CrmCustomer
  /** 自定义字段值: field_id -> value */
  fields: Record<string, string>
}

export interface CrmContact {
  id: number
  customer_id: number
  name: string
  contact_no: string
  phone: string
  email: string
  position: string
  department: string
  /** 0否 1是 */
  is_key_decision_maker: number
  /** 1正常 2停用 */
  status: number
  remark: string
  created_at: string
  updated_at: string
}

/** 跟进类型: WECHAT/PHONE/VISIT/EMAIL/OTHER(字典 FOLLOW_UP_TYPE) */
export interface CrmFollowPlan {
  id: number
  type: string
  content: string
  plan_time: string
  remind_time: string | null
  owner_id: number
  customer_id: number | null
  opportunity_id: number | null
  contact_id: number | null
  contract_id: number | null
  /** 0待办 1已转记录 2已跳过 */
  status: number
  reminded: number
  record_id: number | null
  created_at: string
  updated_at: string
}

export interface CrmFollowRecord {
  id: number
  follow_no: string
  type: string
  content: string
  follow_time: string
  owner_id: number
  customer_id: number | null
  opportunity_id: number | null
  contact_id: number | null
  contract_id: number | null
  plan_id: number | null
  created_at: string
  updated_at: string
}

export interface CrmOpportunity {
  id: number
  name: string
  opportunity_no: string
  customer_id: number
  expected_amount: string
  expected_close_date: string | null
  /** 阶段(字典 OPPORTUNITY_STAGE,运行期以阶段配置为准) */
  stage: string
  probability: number | null
  owner_id: number | null
  follower_id: number | null
  follow_time: string | null
  source_clue_id: number | null
  description: string
  created_at: string
  updated_at: string
}

export interface CrmContract {
  id: number
  contract_no: string
  name: string
  customer_id: number
  opportunity_id: number | null
  title_id: number | null
  total_amount: string
  received_amount: string
  signed_date: string | null
  start_date: string | null
  end_date: string | null
  /** 字典 CONTRACT_STAGE */
  stage: string
  /** 审批状态(NONE/PROCESSING/APPROVED/REJECTED/REVOKED) */
  approval_status: string
  owner_id: number | null
  follower_id: number | null
  follow_time: string | null
  content: string
  created_at: string
  updated_at: string
}

export interface CrmPaymentPlan {
  id: number
  contract_id: number
  plan_date: string | null
  plan_amount: string
  received_amount: string
  /** 0未回款 1部分回款 2已回款 */
  status: number
  remark: string
  created_at: string
  updated_at: string
}

export interface CrmPaymentRecord {
  id: number
  contract_id: number
  plan_id: number | null
  received_date: string | null
  amount: string
  /** 字典 PAYMENT_METHOD */
  method: string
  remark: string
  created_at: string
  updated_at: string
}

export interface CrmPaymentSummary {
  total_amount: string
  received_amount: string
  plans: CrmPaymentPlan[]
}

export interface CrmProduct {
  id: number
  name: string
  product_no: string
  /** 字典 PRODUCT_CATEGORY */
  category: string
  unit: string
  standard_price: string
  cost_price: string
  /** 1上架 2下架(字典 PRODUCT_STATUS) */
  status: number
  image_url: string
  description: string
  created_at: string
  updated_at: string
}

export interface CrmProductPrice {
  id: number
  product_id: number
  /** 字典 PRODUCT_PRICE_TYPE */
  price_type: string
  price: string
  min_quantity: number | null
  remark: string
  created_at: string
  updated_at: string
}

export interface CrmCustomerPool {
  id: number
  name: string
  /** JSON 数组字符串, 如 "[1,2]" */
  scope_dept_ids: string
  scope_role_ids: string
  admin_user_ids: string
  /** 1启用 0禁用 */
  enabled: number
  /** 1开启自动回收 */
  auto_recycle: number
  created_at: string
  updated_at: string
}

/** 公海领取规则(仅 PUT,无 GET) */
export interface CrmPoolPickRule {
  pool_id?: number
  /** 0/1 是否限制每日领取 */
  limit_daily: number
  daily_limit: number
  limit_prev_owner: number
  prev_owner_interval: number
  limit_new_data: number
  new_data_interval: number
}

/** 回收规则条件 */
export interface CrmRecycleCondition {
  /** LAST_FOLLOW_TIME 最近跟进时间 | STORAGE_TIME 领取(入库)时间 */
  timeField: 'LAST_FOLLOW_TIME' | 'STORAGE_TIME'
  /** DYNAMIC: N天未跟进 | FIXED: 固定日期区间 */
  operator: 'DYNAMIC' | 'FIXED'
  /** DYNAMIC 为天数; FIXED 为 "2026-01-01,2026-06-01" */
  value: string
  /** 字段为空是否视为满足 */
  nullSatisfied?: boolean
}

export interface CrmPoolRecycleRule {
  pool_id?: number
  /** AND | OR */
  operator: string
  /** JSON 数组字符串(CrmRecycleCondition[]) */
  conditions: string
}

export interface CrmSetCapacity {
  id: number
  capacity: number
  enabled: number
  filter: string
  scope_dept_ids: string
  scope_role_ids: string
}

/** 阶段定义 */
export interface StageDef {
  key: string
  label: string
  color: string
  sort: number
  probability: number
}

export interface CrmStageConfig {
  id: number
  /** OPPORTUNITY | CONTRACT */
  biz_type: string
  name: string
  stages_json: string
  enabled: number
}

export interface CrmStageConfigResult {
  config: CrmStageConfig
  stages: StageDef[]
}

export interface CrmStageRecord {
  id: number
  biz_type: string
  resource_id: number
  from_stage: string
  to_stage: string
  operator_id: number
  reason: string
}

export interface CrmOwnerHistory {
  id: number
  customer_id: number
  /** null=进公海 */
  owner_id: number | null
  /** TAKE领取 RELEASE退回 TRANSFER转移 RECYCLE自动回收 */
  action: string
  operator_id: number
  reason: string
  created_at: string
  updated_at: string
}

/** 自定义字段定义 */
export interface CrmCustomField {
  /** 32 位 UUID 字符串 */
  id: string
  form_id: string
  internal_key: string
  name: string
  /** 字段类型, 见 CUSTOM_FIELD_TYPES */
  type: string
  mobile: number
  pos: number
  readable: number
  editable: number
  /** 大属性 JSON 字符串(选项/校验等),仅 BLOB 类字段有 */
  prop?: string
}

/** 自定义字段值 */
export interface CrmFieldValue {
  field_id: string
  value: string
}

// ---------- 请求体 ----------

export interface CrmCustomerPayload {
  name: string
  customer_no?: string
  level?: string
  source?: string
  industry?: string
  status?: number
  owner_id?: number
  fields?: CrmFieldValue[]
}

export interface CrmContactPayload {
  customer_id?: number
  name: string
  phone?: string
  email?: string
  position?: string
  department?: string
  is_key_decision_maker?: number
  status?: number
  remark?: string
}

export interface CrmFollowPlanPayload {
  type: string
  content: string
  plan_time: string
  remind_time?: string
  owner_id?: number
  customer_id?: number
  opportunity_id?: number
  contact_id?: number
  contract_id?: number
}

export interface CrmFollowRecordPayload {
  type: string
  content: string
  follow_time: string
  owner_id?: number
  customer_id?: number
  opportunity_id?: number
  contact_id?: number
  contract_id?: number
}

export interface CrmOpportunityPayload {
  name: string
  opportunity_no?: string
  customer_id: number
  expected_amount?: number
  expected_close_date?: string
  stage?: string
  probability?: number
  owner_id?: number
  description?: string
}

export interface CrmContractPayload {
  name: string
  contract_no?: string
  customer_id: number
  opportunity_id?: number
  title_id?: number
  total_amount?: number
  signed_date?: string
  start_date?: string
  end_date?: string
  stage?: string
  owner_id?: number
  content?: string
}

// ── 合同模板 ──
export interface CrmContractTemplate {
  id: number
  name: string
  content: string
  remark: string
  enabled: number
  owner_id: number | null
  created_at: string
  updated_at: string
}

export interface CrmContractTemplatePayload {
  name: string
  content: string
  remark?: string
  enabled?: number
}

export interface ContractVariable {
  key: string
  group: string
  label: string
}

// ── 合同产品明细 ──
export interface CrmContractItem {
  id: number
  contract_id: number
  product_id: number | null
  product_name: string
  quantity: string
  unit: string
  unit_price: string
  amount: string
  remark: string
}

export interface CrmContractItemPayload {
  product_id?: number
  product_name: string
  quantity?: number
  unit?: string
  unit_price?: number
  remark?: string
}

export interface CrmPaymentPlanPayload {
  contract_id?: number
  plan_date: string
  plan_amount: number
  remark?: string
}

export interface CrmPaymentRecordPayload {
  contract_id?: number
  plan_id?: number
  received_date: string
  amount: number
  method?: string
  remark?: string
}

export interface CrmProductPayload {
  name: string
  product_no?: string
  category?: string
  unit?: string
  standard_price?: number
  cost_price?: number
  status?: number
  image_url?: string
  description?: string
}

export interface CrmProductPricePayload {
  product_id?: number
  price_type: string
  price: number
  min_quantity?: number
  remark?: string
}

export interface CrmPoolPayload {
  name: string
  scope_dept_ids?: string
  scope_role_ids?: string
  admin_user_ids?: string
  enabled?: number
  auto_recycle?: number
}

export interface CrmCustomFieldPayload {
  form_key?: string
  internal_key?: string
  name: string
  type: string
  prop?: string
  mobile?: number
  pos?: number
}

/** 自定义字段表单 key */
export const CRM_FORM_KEYS = [
  { label: '客户', value: 'CUSTOMER' },
  { label: '商机', value: 'OPPORTUNITY' },
  { label: '合同', value: 'CONTRACT' },
  { label: '商品', value: 'PRODUCT' },
  { label: '跟进记录', value: 'FOLLOW_UP_RECORD' },
] as const

/** 自定义字段类型(27 种) */
export const CUSTOM_FIELD_TYPES = [
  'INPUT',
  'TEXTAREA',
  'INPUT_NUMBER',
  'DATE_TIME',
  'RADIO',
  'CHECKBOX',
  'SELECT',
  'SELECT_MULTIPLE',
  'INPUT_MULTIPLE',
  'MEMBER',
  'MEMBER_MULTIPLE',
  'DEPARTMENT',
  'DEPARTMENT_MULTIPLE',
  'DIVIDER',
  'PICTURE',
  'LOCATION',
  'PHONE',
  'DATA_SOURCE',
  'DATA_SOURCE_MULTIPLE',
  'SERIAL_NUMBER',
  'ATTACHMENT',
  'LINK',
  'INDUSTRY',
  'FORMULA',
  'SUB_PRODUCT',
  'SUB_PRICE',
] as const
