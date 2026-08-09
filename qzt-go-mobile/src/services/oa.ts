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

// ── 工作日志 ──

export interface WorkLogQuery extends PageParams {
  log_type?: string
  start_date?: string
  end_date?: string
}

export const listWorkLogs = (params: WorkLogQuery) =>
  request.get<unknown, PageResult<any>>('/oa/work-logs', { params })

export const createWorkLog = (data: { log_type?: string; log_date: string; content?: string; plan?: string; problems?: string }) =>
  request.post('/oa/work-logs', data)

// ── 日程安排 ──

export interface ScheduleQuery extends PageParams {
  event_type?: string
  status?: string
  start_date?: string
  end_date?: string
}

export const listSchedules = (params: ScheduleQuery) =>
  request.get<unknown, PageResult<any>>('/oa/schedules', { params })

export const createSchedule = (data: { title: string; event_type?: string; start_time: string; end_time: string; location?: string; content?: string }) =>
  request.post('/oa/schedules', data)

// ── 会议预订 ──

export const listMeetingBookings = (params: PageParams) =>
  request.get<unknown, PageResult<any>>('/oa/meeting-bookings', { params })

export const listMeetingRooms = () =>
  request.get<unknown, { list: any[] }>('/oa/meeting-rooms', { params: { page: 1, page_size: 100 } })

export const createMeetingBooking = (data: { title: string; room_id: number; start_time: string; end_time: string; attendees?: number; topic?: string }) =>
  request.post('/oa/meeting-bookings', data)

export const submitMeetingBookingApproval = (id: number) =>
  request.post('/approval/actions/push', { form_type: 'MEETING_BOOKING', resource_id: id })

// ── 知识库 ──

export const listKbDocuments = (params: PageParams) =>
  request.get<unknown, PageResult<any>>('/kb/documents', { params })

export const getKbDocument = (id: number) =>
  request.get<unknown, any>(`/kb/documents/${id}`)

export const listKbCategories = () =>
  request.get<unknown, { list: any[] }>('/kb/categories')

// ── 网盘 ──

export const listCloudFiles = (parentId = 0, scope = 'personal') =>
  request.get<unknown, { list: any[] }>('/cloud/files', { params: { parent_id: parentId, scope } })

export const createCloudFolder = (data: { parent_id: number; name: string; scope?: string }) =>
  request.post('/cloud/folders', data)
