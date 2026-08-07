import request from '../utils/request'
import type { PageParams } from '../types'
import type { FinReceivable } from '../types/finance'

interface PageResult<T> { list: T[]; total: number }

export interface ReceivableQuery extends PageParams {
  direction?: string
  status?: number
  keyword?: string
}

export const listReceivables = (params: ReceivableQuery) =>
  request.get<unknown, PageResult<FinReceivable>>('/finance/receivables', { params })

export const getReceivable = (id: number) =>
  request.get<unknown, FinReceivable>(`/finance/receivables/${id}`)

export const settleReceivable = (id: number, amount: string, remark?: string) =>
  request.post(`/finance/receivables/${id}/settle`, { amount, remark })
