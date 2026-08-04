import request from '../utils/request'
import type { PageParams } from '../types'
import type { CrmCustomer, CrmCustomerDetail } from '../types/crm'

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
