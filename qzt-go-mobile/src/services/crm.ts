import request from '../utils/request'
import type { PageParams } from '../types'
import type {
  CrmCustomer,
  CrmCustomerDetail,
  CrmLead,
  CrmOpportunity,
  CrmContract,
  CrmProduct,
  CrmTicket,
  CrmFollowPlan,
  DedupResult,
  TicketDetail,
  StageConfig,
  StageRecord,
} from '../types/crm'

interface CrmPageResult<T> {
  list: T[]
  total: number
}

export interface CustomerQuery extends PageParams {
  keyword?: string
  level?: string
  status?: number
  /** 公海过滤:PUBLIC=公海(公共可见) / PRIVATE=私海;留空走数据权限 */
  pool_filter?: 'PUBLIC' | 'PRIVATE'
  /** 公海池 ID(配合 pool_filter=PUBLIC 按池过滤) */
  pool_id?: number
}

/** 我的客户列表 */
export const listCustomers = (params: CustomerQuery) =>
  request.get<unknown, CrmPageResult<CrmCustomer>>('/crm/customers', { params })

/** 客户详情(含联系人) */
export const getCustomer = (id: number) =>
  request.get<unknown, CrmCustomerDetail>(`/crm/customers/${id}`)

/** 新建客户 */
export const createCustomer = (data: {
  name: string
  level?: string
  industry?: string
  source?: string
  fields?: { field_id: string; value: string }[]
}) => request.post('/crm/customers', data)

/** 更新客户 */
export const updateCustomer = (
  id: number,
  data: {
    name?: string
    level?: string
    industry?: string
    source?: string
    fields?: { field_id: string; value: string }[]
  },
) => request.put(`/crm/customers/${id}`, data)

/** 删除客户 */
export const deleteCustomer = (id: number) => request.delete(`/crm/customers/${id}`)

// ── 线索 ──

export interface LeadQuery extends PageParams {
  keyword?: string
  status?: number
  /** 公海过滤:PUBLIC=公海 / PRIVATE=私海;留空走数据权限 */
  pool_filter?: 'PUBLIC' | 'PRIVATE'
  pool_id?: number
}

/** 线索列表 */
export const listLeads = (params: LeadQuery) =>
  request.get<unknown, CrmPageResult<CrmLead>>('/crm/leads', { params })

/** 线索详情(后端返回 {lead, fields}) */
export const getLead = (id: number) =>
  request.get<unknown, { lead: CrmLead; fields: Record<string, string> }>(`/crm/leads/${id}`)

/** 新建线索 */
export const createLead = (data: {
  name: string
  contact_name?: string
  phone?: string
  company?: string
  industry?: string
  source?: string
  fields?: { field_id: string; value: string }[]
}) => request.post('/crm/leads', data)

/** 更新线索 */
export const updateLead = (
  id: number,
  data: {
    name?: string
    contact_name?: string
    phone?: string
    company?: string
    industry?: string
    source?: string
    status?: number
    fields?: { field_id: string; value: string }[]
  },
) => request.put(`/crm/leads/${id}`, data)

/** 领取线索(从公海) */
export const pickLead = (id: number) => request.post<unknown, unknown>(`/crm/leads/${id}/pick`)

/** 释放线索到公海 */
export const releaseLead = (id: number, body: { pool_id: number; reason?: string }) =>
  request.post<unknown, unknown>(`/crm/leads/${id}/release`, body)

/** 线索转化为客户(返回新建客户) */
export const convertLead = (id: number) =>
  request.post<unknown, CrmCustomer>(`/crm/leads/${id}/convert`)

/** 转移线索给其他负责人 */
export const transferLead = (id: number, body: { to_user_id: number }) =>
  request.post<unknown, unknown>(`/crm/leads/${id}/transfer`, body)

/** 删除线索 */
export const deleteLead = (id: number) => request.delete(`/crm/leads/${id}`)

// ── 公海池(客户/线索共用结构) ──

export interface CrmPool {
  id: number
  name: string
  is_default?: number
  enabled?: number
}

/** 启用的客户公海池下拉 */
export const listCustomerPools = () =>
  request.get<unknown, CrmPool[]>('/crm/customer-pools/enabled')

/** 启用的线索公海池下拉 */
export const listLeadPools = () =>
  request.get<unknown, CrmPool[]>('/crm/lead-pools/enabled')

// ── 客户公海操作 ──

/** 领取客户(从公海) */
export const pickCustomer = (id: number) =>
  request.post<unknown, unknown>(`/crm/customers/${id}/pick`)

/** 释放客户到公海 */
export const releaseCustomer = (id: number, body: { pool_id: number; reason?: string }) =>
  request.post<unknown, unknown>(`/crm/customers/${id}/release`, body)

/** 转移客户给其他负责人 */
export const transferCustomer = (id: number, body: { to_user_id: number }) =>
  request.post<unknown, unknown>(`/crm/customers/${id}/transfer`, body)

// ── 查重 ──

/** 客户/线索查重(名称模糊 + 电话精确,跨线索与客户) */
export const dedup = (params: { name?: string; phone?: string }) =>
  request.get<unknown, DedupResult>('/crm/dedup', { params })

// ── 商机 ──

export interface OpportunityQuery extends PageParams {
  keyword?: string
  stage?: string
  customer_id?: number
}

/** 商机列表 */
export const listOpportunities = (params: OpportunityQuery) =>
  request.get<unknown, CrmPageResult<CrmOpportunity>>('/crm/opportunities', { params })

/** 商机详情 */
export const getOpportunity = (id: number) =>
  request.get<unknown, CrmOpportunity>(`/crm/opportunities/${id}`)

/** 阶段配置(GET /crm/stage-configs/:bizType,bizType=OPPORTUNITY/CONTRACT) */
export const getStageConfig = (bizType: string) =>
  request.get<unknown, StageConfig>(`/crm/stage-configs/${bizType}`)

/** 商机阶段推进(PUT /crm/opportunities/:id/stage) */
export const changeOpportunityStage = (id: number, body: { stage: string; reason?: string }) =>
  request.put(`/crm/opportunities/${id}/stage`, body)

/** 商机阶段变更历史(GET /crm/opportunities/:id/stage-history) */
export const getOpportunityStageHistory = (id: number) =>
  request.get<unknown, StageRecord[]>(`/crm/opportunities/${id}/stage-history`)

/** 新建商机 */
export const createOpportunity = (data: {
  name: string
  customer_id: number
  expected_amount?: number
  expected_close_date?: string
  description?: string
}) => request.post('/crm/opportunities', data)

/** 更新商机 */
export const updateOpportunity = (
  id: number,
  data: {
    name?: string
    customer_id?: number
    expected_amount?: number
    expected_close_date?: string
    description?: string
    probability?: number
  },
) => request.put(`/crm/opportunities/${id}`, data)

/** 删除商机 */
export const deleteOpportunity = (id: number) => request.delete(`/crm/opportunities/${id}`)

// ── 合同 ──

export interface ContractQuery extends PageParams {
  keyword?: string
  stage?: string
  customer_id?: number
}

/** 合同列表 */
export const listContracts = (params: ContractQuery) =>
  request.get<unknown, CrmPageResult<CrmContract>>('/crm/contracts', { params })

/** 合同详情 */
export const getContract = (id: number) =>
  request.get<unknown, CrmContract>(`/crm/contracts/${id}`)

/** 新建合同 */
export const createContract = (data: {
  name: string
  customer_id: number
  total_amount: number
  signed_date?: string
  start_date?: string
  end_date?: string
  stage?: string
  content?: string
}) => request.post('/crm/contracts', data)

/** 更新合同 */
export const updateContract = (
  id: number,
  data: {
    name?: string
    customer_id?: number
    total_amount?: number
    signed_date?: string
    start_date?: string
    end_date?: string
    stage?: string
    content?: string
  },
) => request.put(`/crm/contracts/${id}`, data)

/** 删除合同 */
export const deleteContract = (id: number) => request.delete(`/crm/contracts/${id}`)

// ── 跟进计划 ──

/** 我的跟进计划待办(GET /crm/follow-plans/my-todos,无分页) */
export const listMyFollowPlans = () =>
  request.get<unknown, CrmFollowPlan[]>('/crm/follow-plans/my-todos')

/** 新建跟进计划(owner_id 后端自动填当前用户) */
export const createFollowPlan = (data: {
  type: string
  content: string
  plan_time: string
  remind_time?: string
  customer_id?: number
  opportunity_id?: number
  contact_id?: number
  contract_id?: number
  lead_id?: number
}) => request.post('/crm/follow-plans', data)

/** 更新跟进计划 */
export const updateFollowPlan = (
  id: number,
  data: {
    type?: string
    content?: string
    plan_time?: string
    remind_time?: string
    customer_id?: number
    opportunity_id?: number
    contact_id?: number
    contract_id?: number
    lead_id?: number
  },
) => request.put(`/crm/follow-plans/${id}`, data)

/** 跳过跟进计划 */
export const skipFollowPlan = (id: number) => request.post(`/crm/follow-plans/${id}/skip`)

/** 完成跟进计划(转为跟进记录) */
export const convertFollowPlan = (
  id: number,
  body: { type: string; content: string; follow_time?: string },
) => request.post(`/crm/follow-plans/${id}/convert`, body)

/** 删除跟进计划 */
export const deleteFollowPlan = (id: number) => request.delete(`/crm/follow-plans/${id}`)

// ── 产品 ──

export const listProducts = (params: { page: number; page_size: number; keyword?: string }) =>
  request.get<unknown, CrmPageResult<CrmProduct>>('/crm/products', { params })

/** 产品详情 */
export const getProduct = (id: number) =>
  request.get<unknown, CrmProduct>(`/crm/products/${id}`)

/** 新建产品 */
export const createProduct = (data: {
  name: string
  product_no?: string
  category?: string
  spec?: string
  unit?: string
  standard_price?: number
  cost_price?: number
  description?: string
}) => request.post('/crm/products', data)

/** 更新产品 */
export const updateProduct = (
  id: number,
  data: {
    name?: string
    product_no?: string
    category?: string
    spec?: string
    unit?: string
    standard_price?: number
    cost_price?: number
    description?: string
    status?: number
  },
) => request.put(`/crm/products/${id}`, data)

/** 删除产品 */
export const deleteProduct = (id: number) => request.delete(`/crm/products/${id}`)

// ── 售后工单 ──

export const listTickets = (params: { page: number; page_size: number; keyword?: string; status?: number }) =>
  request.get<unknown, CrmPageResult<CrmTicket>>('/crm/tickets', { params })

export const getTicket = (id: number) =>
  request.get<unknown, TicketDetail>(`/crm/tickets/${id}`)

/** 新建工单 */
export const createTicket = (data: {
  title: string
  description?: string
  customer_id?: number
  customer_name?: string
  contact_name?: string
  contact_phone?: string
  category?: string
  priority?: number
  contract_id?: number
}) => request.post('/crm/tickets', data)

/** 更新工单 */
export const updateTicket = (
  id: number,
  data: {
    title?: string
    description?: string
    customer_id?: number
    customer_name?: string
    contact_name?: string
    contact_phone?: string
    category?: string
    priority?: number
    handler_id?: number
  },
) => request.put(`/crm/tickets/${id}`, data)

/** 变更工单状态(会记录处理日志;解决/关闭时可填 solution) */
export const changeTicketStatus = (
  id: number,
  body: { status: number; comment?: string; solution?: string },
) => request.put(`/crm/tickets/${id}/status`, body)

/** 删除工单 */
export const deleteTicket = (id: number) => request.delete(`/crm/tickets/${id}`)
