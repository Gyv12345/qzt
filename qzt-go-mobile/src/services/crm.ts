import request from '../utils/request'
import type { PageParams } from '../types'
import type { CrmCustomer, CrmCustomerDetail, CrmOpportunity, CrmContract } from '../types/crm'

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
