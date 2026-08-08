import request from '../utils/request'
import type { PageParams } from '../types'
import type {
  OaBusinessTrip,
  OaExpense,
  OaExpenseDetail,
  OaExpenseItem,
  OaLoan,
  OaWorkLog,
  OaSchedule,
  OaMeetingRoom,
  OaMeetingBooking,
} from '../types/oa'

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

// ---------- 工作日志 ----------

export interface WorkLogQuery extends PageParams {
  log_type?: string
  start_date?: string
  end_date?: string
}

/** 工作日志列表 */
export const listWorkLogs = (params: WorkLogQuery) =>
  request.get<unknown, PageResult<OaWorkLog>>('/oa/work-logs', { params })

/** 工作日志详情 */
export const getWorkLog = (id: number) =>
  request.get<unknown, OaWorkLog>(`/oa/work-logs/${id}`)

/** 新建工作日志 */
export const createWorkLog = (data: {
  log_type?: string
  log_date: string
  content?: string
  plan?: string
  problems?: string
}) => request.post<unknown, OaWorkLog>('/oa/work-logs', data)

/** 编辑工作日志 */
export const updateWorkLog = (
  id: number,
  data: Partial<Parameters<typeof createWorkLog>[0]>,
) => request.put(`/oa/work-logs/${id}`, data)

/** 删除工作日志 */
export const deleteWorkLog = (id: number) => request.delete(`/oa/work-logs/${id}`)

// ---------- 日程安排 ----------

export interface ScheduleQuery extends PageParams {
  event_type?: string
  status?: string
  start_date?: string
  end_date?: string
}

/** 日程列表 */
export const listSchedules = (params: ScheduleQuery) =>
  request.get<unknown, PageResult<OaSchedule>>('/oa/schedules', { params })

/** 日程日历(指定日期范围) */
export const listScheduleCalendar = (startDate: string, endDate: string) =>
  request.get<unknown, { list: OaSchedule[] }>('/oa/schedules/calendar', {
    params: { start_date: startDate, end_date: endDate },
  })

/** 日程详情 */
export const getSchedule = (id: number) =>
  request.get<unknown, OaSchedule>(`/oa/schedules/${id}`)

/** 新建日程 */
export const createSchedule = (data: {
  title: string
  event_type?: string
  start_time: string
  end_time: string
  location?: string
  content?: string
  remind_type?: string
  status?: string
}) => request.post<unknown, OaSchedule>('/oa/schedules', data)

/** 编辑日程 */
export const updateSchedule = (
  id: number,
  data: Partial<Parameters<typeof createSchedule>[0]>,
) => request.put(`/oa/schedules/${id}`, data)

/** 删除日程 */
export const deleteSchedule = (id: number) => request.delete(`/oa/schedules/${id}`)

// ---------- 会议室管理 ----------

export interface MeetingRoomQuery extends PageParams {
  name?: string
  status?: string
}

/** 会议室列表 */
export const listMeetingRooms = (params?: MeetingRoomQuery) =>
  request.get<unknown, PageResult<OaMeetingRoom>>('/oa/meeting-rooms', { params })

/** 会议室详情 */
export const getMeetingRoom = (id: number) =>
  request.get<unknown, OaMeetingRoom>(`/oa/meeting-rooms/${id}`)

/** 新建会议室 */
export const createMeetingRoom = (data: {
  name: string
  location?: string
  capacity?: number
  equipment?: string
  status?: string
  remark?: string
}) => request.post<unknown, OaMeetingRoom>('/oa/meeting-rooms', data)

/** 编辑会议室 */
export const updateMeetingRoom = (
  id: number,
  data: Partial<Parameters<typeof createMeetingRoom>[0]>,
) => request.put(`/oa/meeting-rooms/${id}`, data)

/** 删除会议室 */
export const deleteMeetingRoom = (id: number) => request.delete(`/oa/meeting-rooms/${id}`)

// ---------- 会议预订 ----------

export interface MeetingBookingQuery extends PageParams {
  room_id?: number
  organizer_id?: number
  approval_status?: string
  start_date?: string
  end_date?: string
}

/** 会议预订列表 */
export const listMeetingBookings = (params: MeetingBookingQuery) =>
  request.get<unknown, PageResult<OaMeetingBooking>>('/oa/meeting-bookings', { params })

/** 会议预订详情 */
export const getMeetingBooking = (id: number) =>
  request.get<unknown, OaMeetingBooking>(`/oa/meeting-bookings/${id}`)

/** 新建会议预订 */
export const createMeetingBooking = (data: {
  title: string
  room_id: number
  start_time: string
  end_time: string
  attendees?: number
  topic?: string
  remark?: string
}) => request.post<unknown, OaMeetingBooking>('/oa/meeting-bookings', data)

/** 编辑会议预订 */
export const updateMeetingBooking = (
  id: number,
  data: Partial<Parameters<typeof createMeetingBooking>[0]>,
) => request.put(`/oa/meeting-bookings/${id}`, data)

/** 删除会议预订 */
export const deleteMeetingBooking = (id: number) =>
  request.delete(`/oa/meeting-bookings/${id}`)

/** 提交会议预订审批 */
export const submitMeetingBookingApproval = (id: number) =>
  request.post('/approval/actions/push', { form_type: 'MEETING_BOOKING', resource_id: id })
