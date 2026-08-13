import request from '../utils/request'
import type { PageParams } from '../types'
import type { FinReceivable, FinAccount, FinVoucher, FinInvoice } from '../types/finance'

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

// ── 会计科目 ──

export const listAccounts = (params?: { type?: string }) =>
  request.get<unknown, FinAccount[]>('/finance/accounts', { params })

export const createAccount = (data: {
  code: string
  name: string
  type: string
  balance_dir: string
  parent_id?: number
  level?: number
  is_leaf?: boolean
  sort?: number
  remark?: string
}) => request.post('/finance/accounts', data)

// ── 凭证 ──

export interface VoucherQuery extends PageParams {
  start_date?: string
  end_date?: string
  account_id?: number
  status?: string
}

export const listVouchers = (params: VoucherQuery) =>
  request.get<unknown, PageResult<FinVoucher>>('/finance/vouchers', { params })

export const getVoucher = (id: number) =>
  request.get<unknown, FinVoucher>(`/finance/vouchers/${id}`)

export const createVoucher = (data: {
  account_id: number
  voucher_date: string
  description: string
  direction: string
  amount: string
  biz_type?: string
  biz_id?: number
  remark?: string
}) => request.post('/finance/vouchers', data)

export const confirmVoucher = (id: number) => request.put(`/finance/vouchers/${id}/confirm`)

// ── 发票 ──

export interface InvoiceQuery extends PageParams {
  direction?: string
  start_date?: string
  end_date?: string
}

export const listInvoices = (params: InvoiceQuery) =>
  request.get<unknown, PageResult<FinInvoice>>('/finance/invoices', { params })

export const getInvoice = (id: number) =>
  request.get<unknown, FinInvoice>(`/finance/invoices/${id}`)

export const createInvoice = (data: {
  invoice_no: string
  invoice_type: string
  direction: string
  invoice_date: string
  amount: string
  tax_rate?: string
  party_name?: string
  party_tax_no?: string
  biz_type?: string
  biz_id?: number
  remark?: string
}) => request.post('/finance/invoices', data)
