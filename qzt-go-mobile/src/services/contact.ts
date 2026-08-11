import request from '../utils/request'

export interface ContactPayload {
  name: string
  phone?: string
  email?: string
  position?: string
  department?: string
  is_key_decision_maker?: number
  remark?: string
}

/** 客户下新建联系人(POST /crm/customers/:id/contacts) */
export const createContact = (customerId: number, data: ContactPayload) =>
  request.post(`/crm/customers/${customerId}/contacts`, data)

/** 更新联系人(PUT /crm/contacts/:id) */
export const updateContact = (id: number, data: ContactPayload) =>
  request.put(`/crm/contacts/${id}`, data)
