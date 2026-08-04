import request from '../utils/request'
import type {
  BalanceSheet,
  CreateAccountPayload,
  CreateInvoicePayload,
  CreateVoucherPayload,
  FinAccount,
  FinInvoice,
  FinVoucher,
  IncomeStatement,
} from '../types/finance'
import type { PageParams } from '../types'

/** 财务分页结构(只有 list+total,与 PSI/CRM 一致) */
export interface FinancePageResult<T> {
  list: T[]
  total: number
}

// ---------- 会计科目(返回数组,非分页) ----------

export interface AccountQuery {
  /** 科目类型 ASSET/LIABILITY/EQUITY/INCOME/EXPENSE */
  type?: string
}

export const listAccounts = (params?: AccountQuery) =>
  request.get<unknown, FinAccount[]>('/finance/accounts', { params })

export const createAccount = (data: CreateAccountPayload) => request.post('/finance/accounts', data)

// ---------- 记账凭证(分页) ----------

export interface VoucherQuery extends PageParams {
  /** DRAFT/CONFIRMED */
  status?: string
  account_id?: number
  start_date?: string
  end_date?: string
}

export const listVouchers = (params?: VoucherQuery) =>
  request.get<unknown, FinancePageResult<FinVoucher>>('/finance/vouchers', { params })

export const createVoucher = (data: CreateVoucherPayload) => request.post('/finance/vouchers', data)

/** 确认凭证(草稿 → 已确认),无请求体 */
export const confirmVoucher = (id: number) => request.put(`/finance/vouchers/${id}/confirm`)

// ---------- 发票管理(分页) ----------

export interface InvoiceQuery extends PageParams {
  /** RECEIVED/ISSUED */
  direction?: string
  start_date?: string
  end_date?: string
}

export const listInvoices = (params?: InvoiceQuery) =>
  request.get<unknown, FinancePageResult<FinInvoice>>('/finance/invoices', { params })

export const createInvoice = (data: CreateInvoicePayload) => request.post('/finance/invoices', data)

// ---------- 财务报表(单对象) ----------

export const getIncomeStatement = (params: { start_date: string; end_date: string }) =>
  request.get<unknown, IncomeStatement>('/finance/reports/income-statement', { params })

export const getBalanceSheet = (params: { end_date: string }) =>
  request.get<unknown, BalanceSheet>('/finance/reports/balance-sheet', { params })
