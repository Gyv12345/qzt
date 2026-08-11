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
  DedupResult,
  TicketDetail,
} from '../types/crm'

interface CrmPageResult<T> {
  list: T[]
  total: number
}

export interface CustomerQuery extends PageParams {
  keyword?: string
  level?: string
  status?: number
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
}) => request.post('/crm/customers', data)

// ── 线索 ──

export interface LeadQuery extends PageParams {
  keyword?: string
  status?: number
}

/** 线索列表 */
export const listLeads = (params: LeadQuery) =>
  request.get<unknown, CrmPageResult<CrmLead>>('/crm/leads', { params })

/** 线索详情(后端返回 {lead, fields},mobile 暂未接入自定义字段,只取 lead) */
export const getLead = async (id: number) => {
  const res = await request.get<unknown, { lead: CrmLead; fields: Record<string, string> }>(
    `/crm/leads/${id}`,
  )
  return res.lead
}

/** 新建线索 */
export const createLead = (data: {
  name: string
  contact_name?: string
  phone?: string
  company?: string
  industry?: string
  source?: string
}) => request.post('/crm/leads', data)

/** 领取线索(从公海) */
export const pickLead = (id: number) => request.post<unknown, unknown>(`/crm/leads/${id}/pick`)

/** 释放线索到公海 */
export const releaseLead = (id: number, body: { pool_id: number; reason?: string }) =>
  request.post<unknown, unknown>(`/crm/leads/${id}/release`, body)

/** 线索转化为客户(返回新建客户) */
export const convertLead = (id: number) =>
  request.post<unknown, CrmCustomer>(`/crm/leads/${id}/convert`)

// ── 查重 ──

/** 客户/线索查重(名称模糊 + 电话精确,跨线索与客户) */
export const dedup = (params: { name?: string; phone?: string }) =>
  request.get<unknown, DedupResult>('/crm/dedup', { params })

// ── 商机 ──

export interface OpportunityQuery extends PageParams {
  keyword?: string
  stage?: string
}

/** 商机列表 */
export const listOpportunities = (params: OpportunityQuery) =>
  request.get<unknown, CrmPageResult<CrmOpportunity>>('/crm/opportunities', { params })

/** 商机详情 */
export const getOpportunity = (id: number) =>
  request.get<unknown, CrmOpportunity>(`/crm/opportunities/${id}`)

/** 新建商机 */
export const createOpportunity = (data: {
  name: string
  customer_id: number
  expected_amount?: number
  expected_close_date?: string
  description?: string
}) => request.post('/crm/opportunities', data)

// ── 合同 ──

export interface ContractQuery extends PageParams {
  keyword?: string
  stage?: string
}

/** 合同列表 */
export const listContracts = (params: ContractQuery) =>
  request.get<unknown, CrmPageResult<CrmContract>>('/crm/contracts', { params })

/** 合同详情 */
export const getContract = (id: number) =>
  request.get<unknown, CrmContract>(`/crm/contracts/${id}`)

// ── 产品 ──

export const listProducts = (params: { page: number; page_size: number; keyword?: string }) =>
  request.get<unknown, CrmPageResult<CrmProduct>>('/crm/products', { params })

// ── 售后工单 ──

export const listTickets = (params: { page: number; page_size: number; keyword?: string; status?: number }) =>
  request.get<unknown, CrmPageResult<CrmTicket>>('/crm/tickets', { params })

export const getTicket = (id: number) =>
  request.get<unknown, TicketDetail>(`/crm/tickets/${id}`)
