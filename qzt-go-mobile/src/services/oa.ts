import request from '../utils/request'
import type { PageParams } from '../types'
import type { OaExpense, OaExpenseDetail, OaBusinessTrip, OaLoan } from '../types/oa'

interface PageResult<T> {
  list: T[]
  total: number
}

// ── 报销 ──

export interface ExpenseQuery extends PageParams {
  expense_type?: string
  approval_status?: string
}

export const listExpenses = (params: ExpenseQuery) =>
  request.get<unknown, PageResult<OaExpense>>('/oa/expenses', { params })

/** 新建报销 */
export const createExpense = (data: {
  title: string
  expense_type: string
  amount: string
  occur_date?: string
  description?: string
}) => request.post('/oa/expenses', { ...data, items: [] })

export const getExpense = (id: number) =>
  request.get<unknown, OaExpenseDetail>(`/oa/expenses/${id}`)

export const submitExpenseApproval = (id: number) =>
  request.post('/approval/actions/push', { form_type: 'EXPENSE', resource_id: id })

// ── 出差 ──

export interface TripQuery extends PageParams {
  approval_status?: string
}

export const listTrips = (params: TripQuery) =>
  request.get<unknown, PageResult<OaBusinessTrip>>('/oa/trips', { params })

/** 新建出差申请 */
export const createTrip = (data: {
  title: string
  destination: string
  start_date: string
  end_date: string
  purpose?: string
  transport?: string
  budget_amount?: string
}) => request.post('/oa/trips', data)

export const getTrip = (id: number) =>
  request.get<unknown, OaBusinessTrip>(`/oa/trips/${id}`)

export const submitTripApproval = (id: number) =>
  request.post('/approval/actions/push', { form_type: 'TRIP', resource_id: id })

// ── 借款 ──

export interface LoanQuery extends PageParams {
  loan_type?: string
  approval_status?: string
  repaid_status?: number
}

export const listLoans = (params: LoanQuery) =>
  request.get<unknown, PageResult<OaLoan>>('/oa/loans', { params })

export const getLoan = (id: number) =>
  request.get<unknown, OaLoan>(`/oa/loans/${id}`)

export const submitLoanApproval = (id: number) =>
  request.post('/approval/actions/push', { form_type: 'LOAN', resource_id: id })

export const markLoanRepaid = (id: number) =>
  request.post(`/oa/loans/${id}/mark-repaid`)
