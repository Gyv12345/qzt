import request from '../utils/request'
import type {
  CrmContact,
  CrmContactPayload,
  CrmContract,
  CrmTicket,
  TicketDetail,
  CrmContractPayload,
  CrmContractItem,
  CrmContractItemPayload,
  CrmContractTemplate,
  CrmContractTemplatePayload,
  EsignSigner,
  EsignTaskDetail,
  ContractVariable,
  CrmCustomField,
  CrmCustomFieldPayload,
  CrmCustomer,
  CrmCustomerDetail,
  CrmCustomerPayload,
  CrmCustomerPool,
  CrmFieldValue,
  CrmFollowPlan,
  CrmFollowPlanPayload,
  CrmFollowRecord,
  CrmFollowRecordPayload,
  CrmOpportunity,
  CrmOpportunityPayload,
  CrmOwnerHistory,
  CrmPaymentPlan,
  CrmPaymentPlanPayload,
  CrmPaymentRecord,
  CrmPaymentRecordPayload,
  CrmPaymentSummary,
  CrmPoolPayload,
  CrmPoolPickRule,
  CrmPoolRecycleRule,
  CrmProduct,
  CrmProductPayload,
  CrmProductPrice,
  CrmProductPricePayload,
  CrmStageConfigResult,
  CrmStageRecord,
  StageDef,
} from '../types/crm'
import type { PageParams, PageResult } from '../types'

/** CRM/CMS 列表分页结构(与系统模块不同,只有 list+total) */
export interface CrmPageResult<T> {
  list: T[]
  total: number
}

// ---------- 客户管理 ----------

export interface CustomerQuery extends PageParams {
  keyword?: string
  level?: string
  source?: string
  status?: string
  industry?: string
  /** 公海筛选:PUBLIC=公海 PRIVATE=私海 不传=默认(走数据权限) */
  pool_filter?: string
  pool_id?: number
}

export const listCustomers = (params?: CustomerQuery) =>
  request.get<unknown, CrmPageResult<CrmCustomer>>('/crm/customers', { params })

export const getCustomer = (id: number) =>
  request.get<unknown, CrmCustomerDetail>(`/crm/customers/${id}`)

export const createCustomer = (data: CrmCustomerPayload) => request.post('/crm/customers', data)

export const updateCustomer = (id: number, data: CrmCustomerPayload) =>
  request.put(`/crm/customers/${id}`, data)

export const deleteCustomer = (id: number) => request.delete(`/crm/customers/${id}`)

/** 从公海领取客户(无请求体) */
export const pickCustomer = (id: number) => request.post(`/crm/customers/${id}/pick`)

export const releaseCustomer = (id: number, data: { pool_id: number; reason?: string }) =>
  request.post(`/crm/customers/${id}/release`, data)

export const transferCustomer = (id: number, toUserId: number) =>
  request.post(`/crm/customers/${id}/transfer`, { to_user_id: toUserId })

export const getCustomerOwnerHistory = (id: number) =>
  request.get<unknown, CrmOwnerHistory[]>(`/crm/customers/${id}/owner-history`)

// ---------- 联系人 ----------

export const listCustomerContacts = (customerId: number) =>
  request.get<unknown, CrmContact[]>(`/crm/customers/${customerId}/contacts`)

export const createContact = (customerId: number, data: CrmContactPayload) =>
  request.post(`/crm/customers/${customerId}/contacts`, data)

export const updateContact = (id: number, data: CrmContactPayload) =>
  request.put(`/crm/contacts/${id}`, data)

export const deleteContact = (id: number) => request.delete(`/crm/contacts/${id}`)

// ---------- 跟进计划/记录 ----------

export const listMyTodoPlans = () =>
  request.get<unknown, CrmFollowPlan[]>('/crm/follow-plans/my-todos')

export const createFollowPlan = (data: CrmFollowPlanPayload) =>
  request.post('/crm/follow-plans', data)

export const updateFollowPlan = (id: number, data: Partial<CrmFollowPlanPayload>) =>
  request.put(`/crm/follow-plans/${id}`, data)

export const deleteFollowPlan = (id: number) => request.delete(`/crm/follow-plans/${id}`)

/** 将跟进计划转为记录(请求体同创建记录) */
export const convertFollowPlan = (id: number, data: CrmFollowRecordPayload) =>
  request.post(`/crm/follow-plans/${id}/convert`, data)

export const skipFollowPlan = (id: number) => request.post(`/crm/follow-plans/${id}/skip`)

export const createFollowRecord = (data: CrmFollowRecordPayload) =>
  request.post('/crm/follow-records', data)

export const updateFollowRecord = (id: number, data: Partial<CrmFollowRecordPayload>) =>
  request.put(`/crm/follow-records/${id}`, data)

export const deleteFollowRecord = (id: number) => request.delete(`/crm/follow-records/${id}`)

/** 按资源查跟进时间线, field: customer_id/opportunity_id/contact_id/contract_id */
export const getFollowTimeline = (field: string, value: number) =>
  request.get<unknown, CrmFollowRecord[]>('/crm/follow-records/timeline', {
    params: { field, value },
  })

// ---------- 商机管理 ----------

export interface OpportunityQuery extends PageParams {
  keyword?: string
  customer_id?: number
  stage?: string
}

export const listOpportunities = (params?: OpportunityQuery) =>
  request.get<unknown, CrmPageResult<CrmOpportunity>>('/crm/opportunities', { params })

export const getOpportunity = (id: number) =>
  request.get<unknown, CrmOpportunity>(`/crm/opportunities/${id}`)

/** 看板: { [stage]: Opportunity[] } */
export const getOpportunityBoard = () =>
  request.get<unknown, Record<string, CrmOpportunity[]>>('/crm/opportunities/board')

export const createOpportunity = (data: CrmOpportunityPayload) =>
  request.post('/crm/opportunities', data)

export const updateOpportunity = (id: number, data: CrmOpportunityPayload) =>
  request.put(`/crm/opportunities/${id}`, data)

export const deleteOpportunity = (id: number) => request.delete(`/crm/opportunities/${id}`)

export const changeOpportunityStage = (id: number, stage: string, reason?: string) =>
  request.put(`/crm/opportunities/${id}/stage`, { stage, reason })

export const getOpportunityStageHistory = (id: number) =>
  request.get<unknown, CrmStageRecord[]>(`/crm/opportunities/${id}/stage-history`)

// ---------- 合同管理 ----------

export interface ContractQuery extends PageParams {
  keyword?: string
  customer_id?: number
  stage?: string
}

export const listContracts = (params?: ContractQuery) =>
  request.get<unknown, CrmPageResult<CrmContract>>('/crm/contracts', { params })

export const getContract = (id: number) =>
  request.get<unknown, CrmContract>(`/crm/contracts/${id}`)

export const createContract = (data: CrmContractPayload) => request.post('/crm/contracts', data)

export const updateContract = (id: number, data: CrmContractPayload) =>
  request.put(`/crm/contracts/${id}`, data)

export const deleteContract = (id: number) => request.delete(`/crm/contracts/${id}`)

// 电子签(e签宝):查询签署详情 / 发起签署(补充签署方)
export const getEsignStatus = (contractId: number) =>
  request.get<unknown, EsignTaskDetail>(`/crm/contracts/${contractId}/esign`)

export const initiateEsign = (contractId: number, signers: EsignSigner[]) =>
  request.post(`/crm/contracts/${contractId}/esign/initiate`, { signers })

export const getContractPaymentSummary = (id: number) =>
  request.get<unknown, CrmPaymentSummary>(`/crm/contracts/${id}/payment-summary`)

// ---------- 合同模板 ----------

export interface ContractTemplateQuery extends PageParams {
  keyword?: string
  enabled?: number
}

export const listContractTemplates = (params?: ContractTemplateQuery) =>
  request.get<unknown, CrmPageResult<CrmContractTemplate>>('/crm/contract-templates', { params })

export const getContractTemplate = (id: number) =>
  request.get<unknown, CrmContractTemplate>(`/crm/contract-templates/${id}`)

export const createContractTemplate = (data: CrmContractTemplatePayload) =>
  request.post('/crm/contract-templates', data)

export const updateContractTemplate = (id: number, data: Partial<CrmContractTemplatePayload>) =>
  request.put(`/crm/contract-templates/${id}`, data)

export const deleteContractTemplate = (id: number) =>
  request.delete(`/crm/contract-templates/${id}`)

export const listContractVariables = () =>
  request.get<unknown, ContractVariable[]>('/crm/contract-templates/variables')

export const printContractDocument = (contractId: number, templateId: number) =>
  request.get<unknown, { markdown: string }>(
    `/crm/contracts/${contractId}/print-document`,
    { params: { template_id: templateId } },
  )

// ---------- 合同产品明细 ----------

export const listContractItems = (contractId: number) =>
  request.get<unknown, CrmContractItem[]>(`/crm/contracts/${contractId}/items`)

export const createContractItem = (contractId: number, data: CrmContractItemPayload) =>
  request.post(`/crm/contracts/${contractId}/items`, data)

export const updateContractItem = (itemId: number, data: Partial<CrmContractItemPayload>) =>
  request.put(`/crm/contract-items/${itemId}`, data)

export const deleteContractItem = (itemId: number) =>
  request.delete(`/crm/contract-items/${itemId}`)

// ---------- 回款计划/记录 ----------

export const listPaymentPlans = (contractId: number) =>
  request.get<unknown, CrmPaymentPlan[]>(`/crm/contracts/${contractId}/payment-plans`)

export const createPaymentPlan = (contractId: number, data: CrmPaymentPlanPayload) =>
  request.post(`/crm/contracts/${contractId}/payment-plans`, data)

export const updatePaymentPlan = (id: number, data: Partial<CrmPaymentPlanPayload>) =>
  request.put(`/crm/payment-plans/${id}`, data)

export const deletePaymentPlan = (id: number) => request.delete(`/crm/payment-plans/${id}`)

export const listPaymentRecords = (contractId: number) =>
  request.get<unknown, CrmPaymentRecord[]>(`/crm/contracts/${contractId}/payment-records`)

export const createPaymentRecord = (contractId: number, data: CrmPaymentRecordPayload) =>
  request.post(`/crm/contracts/${contractId}/payment-records`, data)

export const updatePaymentRecord = (id: number, data: Partial<CrmPaymentRecordPayload>) =>
  request.put(`/crm/payment-records/${id}`, data)

export const deletePaymentRecord = (id: number) => request.delete(`/crm/payment-records/${id}`)

// ---------- 产品管理 ----------

export interface ProductQuery extends PageParams {
  keyword?: string
  category?: string
  status?: number
}

export const listProducts = (params?: ProductQuery) =>
  request.get<unknown, CrmPageResult<CrmProduct>>('/crm/products', { params })

export const createProduct = (data: CrmProductPayload) => request.post('/crm/products', data)

export const updateProduct = (id: number, data: CrmProductPayload) =>
  request.put(`/crm/products/${id}`, data)

export const deleteProduct = (id: number) => request.delete(`/crm/products/${id}`)

export const listProductPrices = (productId: number) =>
  request.get<unknown, CrmProductPrice[]>(`/crm/products/${productId}/prices`)

export const createProductPrice = (productId: number, data: CrmProductPricePayload) =>
  request.post(`/crm/products/${productId}/prices`, data)

export const updateProductPrice = (id: number, data: Partial<CrmProductPricePayload>) =>
  request.put(`/crm/product-prices/${id}`, data)

export const deleteProductPrice = (id: number) => request.delete(`/crm/product-prices/${id}`)

// ---------- 公海池 ----------

export const listCustomerPools = () =>
  request.get<unknown, CrmCustomerPool[]>('/crm/customer-pools')

export const listEnabledPools = () =>
  request.get<unknown, CrmCustomerPool[]>('/crm/customer-pools/enabled')

export const createCustomerPool = (data: CrmPoolPayload) => request.post('/crm/customer-pools', data)

export const updateCustomerPool = (id: number, data: CrmPoolPayload) =>
  request.put(`/crm/customer-pools/${id}`, data)

export const deleteCustomerPool = (id: number) => request.delete(`/crm/customer-pools/${id}`)

export const setPoolPickRule = (id: number, data: CrmPoolPickRule) =>
  request.put(`/crm/customer-pools/${id}/pick-rule`, data)

export const setPoolRecycleRule = (id: number, data: CrmPoolRecycleRule) =>
  request.put(`/crm/customer-pools/${id}/recycle-rule`, data)

export const recyclePool = (id: number) => request.post(`/crm/customer-pools/${id}/recycle`)

// ---------- 自定义字段 ----------

export const listCustomFields = (formKey: string) =>
  request.get<unknown, CrmCustomField[]>('/crm/custom-fields', { params: { form_key: formKey } })

export const createCustomField = (data: CrmCustomFieldPayload) =>
  request.post('/crm/custom-fields', data)

export const updateCustomField = (id: string, data: CrmCustomFieldPayload) =>
  request.put(`/crm/custom-fields/${id}`, data)

export const deleteCustomField = (id: string) => request.delete(`/crm/custom-fields/${id}`)

// ---------- 阶段配置 ----------

export const getStageConfig = (bizType: 'OPPORTUNITY' | 'CONTRACT') =>
  request.get<unknown, CrmStageConfigResult>(`/crm/stage-configs/${bizType}`)

export const updateStageConfig = (bizType: 'OPPORTUNITY' | 'CONTRACT', stages: StageDef[]) =>
  request.put(`/crm/stage-configs/${bizType}`, stages)

export type { CrmFieldValue }

// ---------- 联系人(全局) ----------

export interface CrmContactListItem {
  id: number
  customer_id: number
  customer_name: string
  name: string
  contact_no: string
  phone: string
  email: string
  position: string
  department: string
  is_key_decision_maker: number
  status: number
  remark: string
  created_at: string
}

export const listContacts = (
  params?: { page?: number; page_size?: number; keyword?: string; customer_id?: number },
) => request.get<unknown, PageResult<CrmContactListItem>>('/crm/contacts', { params })

// ---------- 客户团队协作 ----------
export interface CrmCollaboration {
  id: number
  customer_id: number
  user_id: number
  collaboration_type: 'READ_ONLY' | 'COLLABORATION'
  nickname: string
  username: string
  created_at: string
}
export const listCollaborations = (customerId: number) =>
  request.get<unknown, CrmCollaboration[]>('/crm/customers/' + customerId + '/collaborations')
export const addCollaboration = (customerId: number, data: { user_id: number; collaboration_type: string }) =>
  request.post('/crm/customers/' + customerId + '/collaborations', data)
export const updateCollaboration = (id: number, data: { collaboration_type: string }) =>
  request.put('/crm/collaborations/' + id, data)
export const deleteCollaboration = (id: number) =>
  request.delete('/crm/collaborations/' + id)

// ── 售后工单 ──

export interface TicketQuery extends PageParams {
  keyword?: string
  category?: string
  status?: number
  priority?: number
  customer_id?: number
  handler_id?: number
}

export const listTickets = (params: TicketQuery) =>
  request.get<unknown, CrmPageResult<CrmTicket>>('/crm/tickets', { params })

export const getTicket = (id: number) =>
  request.get<unknown, TicketDetail>(`/crm/tickets/${id}`)

export const createTicket = (data: {
  title: string
  description?: string
  customer_id?: number
  customer_name?: string
  contract_id?: number
  contact_name?: string
  contact_phone?: string
  category?: string
  priority?: number
}) => request.post<unknown, CrmTicket>('/crm/tickets', data)

export const updateTicket = (id: number, data: Partial<Parameters<typeof createTicket>[0]> & {
  handler_id?: number
}) => request.put(`/crm/tickets/${id}`, data)

export const changeTicketStatus = (id: number, status: number, solution?: string, comment?: string) =>
  request.put(`/crm/tickets/${id}/status`, { status, solution, comment })

export const deleteTicket = (id: number) => request.delete(`/crm/tickets/${id}`)
