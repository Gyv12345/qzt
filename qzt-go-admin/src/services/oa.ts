import request from '../utils/request'
import type { PageParams } from '../types'
import type { OaBusinessTrip, OaExpense, OaExpenseDetail, OaExpenseItem, OaLoan } from '../types/oa'

interface PageResult<T> {
  list: T[]
  total: number
}

export interface ExpenseQuery extends PageParams {
  applicant_id?: number
  expense_type?: string
  approval_status?: string
  payment_status?: number
}

/** 报销单列表 */
export const listExpenses = (params: ExpenseQuery) =>
  request.get<unknown, PageResult<OaExpense>>('/oa/expenses', { params })

/** 报销单详情 */
export const getExpense = (id: number) =>
  request.get<unknown, OaExpenseDetail>(`/oa/expenses/${id}`)

/** 新建报销单 */
export const createExpense = (data: {
  title: string
  expense_type: string
  amount: string
  occur_date?: string
  description?: string
  items: OaExpenseItem[]
}) => request.post<unknown, OaExpense>('/oa/expenses', data)

/** 编辑报销单 */
export const updateExpense = (
  id: number,
  data: {
    title: string
    dept_id?: number
    expense_type?: string
    amount?: string
    occur_date?: string
    description?: string
    items: OaExpenseItem[]
  },
) => request.put(`/oa/expenses/${id}`, data)

/** 删除报销单 */
export const deleteExpense = (id: number) => request.delete(`/oa/expenses/${id}`)

/** 标记已打款 */
export const markExpensePaid = (id: number) =>
  request.post(`/oa/expenses/${id}/mark-paid`)

/** 提交审批(封装审批引擎 push) */
export const submitExpenseApproval = (id: number) =>
  request.post('/approval/actions/push', { form_type: 'EXPENSE', resource_id: id })

// ---------- 出差 ----------

export interface TripQuery extends PageParams {
  applicant_id?: number
  approval_status?: string
}

/** 出差列表 */
export const listTrips = (params: TripQuery) =>
  request.get<unknown, PageResult<OaBusinessTrip>>('/oa/trips', { params })

/** 出差详情 */
export const getTrip = (id: number) =>
  request.get<unknown, OaBusinessTrip>(`/oa/trips/${id}`)

/** 新建出差 */
export const createTrip = (data: {
  title: string
  destination: string
  start_date: string
  end_date: string
  purpose?: string
  transport?: string
  budget_amount?: string
  description?: string
}) => request.post<unknown, OaBusinessTrip>('/oa/trips', data)

/** 编辑出差 */
export const updateTrip = (id: number, data: Partial<Parameters<typeof createTrip>[0]>) =>
  request.put(`/oa/trips/${id}`, data)

/** 删除出差 */
export const deleteTrip = (id: number) => request.delete(`/oa/trips/${id}`)

/** 提交出差审批 */
export const submitTripApproval = (id: number) =>
  request.post('/approval/actions/push', { form_type: 'TRIP', resource_id: id })

// ---------- 借款/备用金 ----------

export interface LoanQuery extends PageParams {
  applicant_id?: number
  loan_type?: string
  approval_status?: string
  repaid_status?: number
}

/** 借款列表 */
export const listLoans = (params: LoanQuery) =>
  request.get<unknown, PageResult<OaLoan>>('/oa/loans', { params })

/** 借款详情 */
export const getLoan = (id: number) =>
  request.get<unknown, OaLoan>(`/oa/loans/${id}`)

/** 新建借款 */
export const createLoan = (data: {
  title: string
  loan_type: string
  amount: string
  expected_date?: string
  reason?: string
}) => request.post<unknown, OaLoan>('/oa/loans', data)

/** 编辑借款 */
export const updateLoan = (id: number, data: Partial<Parameters<typeof createLoan>[0]>) =>
  request.put(`/oa/loans/${id}`, data)

/** 删除借款 */
export const deleteLoan = (id: number) => request.delete(`/oa/loans/${id}`)

/** 标记已还清 */
export const markLoanRepaid = (id: number) =>
  request.post(`/oa/loans/${id}/mark-repaid`)

/** 提交借款审批 */
export const submitLoanApproval = (id: number) =>
  request.post('/approval/actions/push', { form_type: 'LOAN', resource_id: id })
