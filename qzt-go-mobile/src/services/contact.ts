import request from '../utils/request'
import type { CrmContact } from '../types/crm'

export interface ContactPayload {
  name: string
  phone?: string
  email?: string
  position?: string
  department?: string
  is_key_decision_maker?: number
  status?: number
  remark?: string
}

/** 客户下新建联系人(POST /crm/customers/:id/contacts) */
export const createContact = (customerId: number, data: ContactPayload) =>
  request.post(`/crm/customers/${customerId}/contacts`, data)

/** 更新联系人(PUT /crm/contacts/:id) */
export const updateContact = (id: number, data: ContactPayload) =>
  request.put(`/crm/contacts/${id}`, data)

/** 全局联系人列表(GET /crm/contacts,独立管理页) */
export const listContacts = (params: { page: number; page_size: number; keyword?: string }) =>
  request.get<unknown, { list: CrmContact[]; total: number }>('/crm/contacts', { params })

/** 删除联系人 */
export const deleteContact = (id: number) => request.delete(`/crm/contacts/${id}`)
