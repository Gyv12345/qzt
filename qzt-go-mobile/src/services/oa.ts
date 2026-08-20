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

// ── 借款新建(补充) ──

// 字段名与后端 CreateLoanRequest 对齐:expected_date / reason(旧写法 expected_repay_date/purpose 会被后端丢弃)
export const createLoan = (data: {
  title: string
  loan_type: string
  amount: string
  expected_date?: string
  reason?: string
}) => request.post('/oa/loans', data)

// ── 编辑 / 删除(补充) ──

export const updateExpense = (
  id: number,
  data: { title?: string; expense_type?: string; amount?: string; occur_date?: string; description?: string },
) => request.put(`/oa/expenses/${id}`, data)
export const deleteExpense = (id: number) => request.delete(`/oa/expenses/${id}`)

export const updateTrip = (id: number, data: Partial<Parameters<typeof createTrip>[0]>) =>
  request.put(`/oa/trips/${id}`, data)
export const deleteTrip = (id: number) => request.delete(`/oa/trips/${id}`)

export const updateLoan = (id: number, data: Partial<Parameters<typeof createLoan>[0]>) =>
  request.put(`/oa/loans/${id}`, data)
export const deleteLoan = (id: number) => request.delete(`/oa/loans/${id}`)

export const updateWorkLog = (id: number, data: Partial<Parameters<typeof createWorkLog>[0]>) =>
  request.put(`/oa/work-logs/${id}`, data)
export const deleteWorkLog = (id: number) => request.delete(`/oa/work-logs/${id}`)

export const updateSchedule = (id: number, data: Partial<Parameters<typeof createSchedule>[0]>) =>
  request.put(`/oa/schedules/${id}`, data)
export const deleteSchedule = (id: number) => request.delete(`/oa/schedules/${id}`)

export const updateMeetingBooking = (id: number, data: Partial<Parameters<typeof createMeetingBooking>[0]>) =>
  request.put(`/oa/meeting-bookings/${id}`, data)
export const deleteMeetingBooking = (id: number) => request.delete(`/oa/meeting-bookings/${id}`)

// ── 自定义表单(补充) ──

export interface OaFormData {
  id: number
  form_no: string
  template_id: number
  template_name?: string
  title: string
  form_data: Record<string, any>
  approval_status: string
  created_at: string
}

export const listFormData = (params: PageParams) =>
  request.get<unknown, PageResult<OaFormData>>('/oa/form-data', { params })
export const getFormData = (id: number) =>
  request.get<unknown, OaFormData>(`/oa/form-data/${id}`)
export const createFormData = (data: { template_id: number; title: string; form_data: Record<string, any> }) =>
  request.post('/oa/form-data', data)
export const updateFormData = (id: number, data: { title?: string; form_data?: Record<string, any> }) =>
  request.put(`/oa/form-data/${id}`, data)
export const deleteFormData = (id: number) => request.delete(`/oa/form-data/${id}`)
export const submitFormDataApproval = (id: number) =>
  request.post('/approval/actions/push', { form_type: 'OA_CUSTOM', resource_id: id })

// ── 网盘文件管理(补充:上传元数据 / 删除 / 重命名移动) ──

export const createCloudFile = (data: { parent_id: number; name: string; object_key?: string; url?: string; size?: number; scope?: string }) =>
  request.post('/cloud/files', data)
export const deleteCloudFile = (id: number) => request.delete(`/cloud/files/${id}`)
export const renameCloudFile = (id: number, data: { name?: string; parent_id?: number }) =>
  request.put(`/cloud/files/${id}`, data)

// ── 知识库文档管理(补充) ──

export const createKbDocument = (data: { title: string; content?: string; category_id?: number; status?: string }) =>
  request.post('/kb/documents', data)
export const updateKbDocument = (id: number, data: { title?: string; content?: string; category_id?: number; status?: string }) =>
  request.put(`/kb/documents/${id}`, data)
export const deleteKbDocument = (id: number) => request.delete(`/kb/documents/${id}`)
