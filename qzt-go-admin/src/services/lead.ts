import request from '../utils/request'
import type { CrmLead, CrmLeadDetail, CrmLeadOwnerHistory, CrmLeadPayload, CrmLeadPool } from '../types/lead'
import type { CrmPoolPickRule, CrmPoolRecycleRule } from '../types/crm'
import type { PageParams } from '../types'

/** 线索分页结构(只有 list+total,与 CRM 其它模块一致) */
export interface LeadPageResult<T> {
  list: T[]
  total: number
}

// ---------- 线索管理 ----------

export interface LeadQuery extends PageParams {
  keyword?: string
  level?: string
  source?: string
  status?: string
  industry?: string
  /** 公海筛选:PUBLIC=公海 PRIVATE=私海 不传=默认(走数据权限) */
  pool_filter?: string
  pool_id?: number
}

export const listLeads = (params?: LeadQuery) =>
  request.get<unknown, LeadPageResult<CrmLead>>('/crm/leads', { params })

export const getLead = (id: number) => request.get<unknown, CrmLeadDetail>(`/crm/leads/${id}`)

export const createLead = (data: CrmLeadPayload) => request.post('/crm/leads', data)

export const updateLead = (id: number, data: CrmLeadPayload) => request.put(`/crm/leads/${id}`, data)

export const deleteLead = (id: number) => request.delete(`/crm/leads/${id}`)

/** 从公海领取线索(无请求体) */
export const pickLead = (id: number) => request.post(`/crm/leads/${id}/pick`)

export const releaseLead = (id: number, data: { pool_id: number; reason?: string }) =>
  request.post(`/crm/leads/${id}/release`, data)

export const transferLead = (id: number, toUserId: number) =>
  request.post(`/crm/leads/${id}/transfer`, { to_user_id: toUserId })

/** 线索转化为客户 */
export const convertLead = (id: number) => request.post<unknown, { id: number }>(`/crm/leads/${id}/convert`)

export const getLeadOwnerHistory = (id: number) =>
  request.get<unknown, CrmLeadOwnerHistory[]>(`/crm/leads/${id}/owner-history`)

// ---------- 线索公海池 ----------

export const listLeadPools = () => request.get<unknown, CrmLeadPool[]>('/crm/lead-pools')

export const listEnabledLeadPools = () =>
  request.get<unknown, CrmLeadPool[]>('/crm/lead-pools/enabled')

export const createLeadPool = (data: Partial<CrmLeadPool>) => request.post('/crm/lead-pools', data)

export const updateLeadPool = (id: number, data: Partial<CrmLeadPool>) =>
  request.put(`/crm/lead-pools/${id}`, data)

export const deleteLeadPool = (id: number) => request.delete(`/crm/lead-pools/${id}`)

export const setLeadPoolPickRule = (id: number, data: CrmPoolPickRule) =>
  request.put(`/crm/lead-pools/${id}/pick-rule`, data)

export const setLeadPoolRecycleRule = (id: number, data: CrmPoolRecycleRule) =>
  request.put(`/crm/lead-pools/${id}/recycle-rule`, data)

export const recycleLeadPool = (id: number) => request.post(`/crm/lead-pools/${id}/recycle`)
