import request from '../utils/request'
import type {
  HrmAttendanceGroup,
  HrmAttendanceSummary,
  HrmCandidate,
  HrmDepartment,
  HrmDepartmentPayload,
  HrmEmployee,
  HrmEmployeeChange,
  HrmEmployeePayload,
  HrmHoliday,
  HrmJob,
  HrmLeave,
  HrmPerformance,
  HrmPosition,
  HrmPositionPayload,
  HrmScheduleMonthRow,
  HrmShift,
} from '../types/hrm'
import type { PageParams } from '../types'

/** HRM 分页结构(只有 list+total) */
export interface HrmPageResult<T> {
  list: T[]
  total: number
}

// ---------- 部门 ----------

export const listDepartments = (params?: { keyword?: string; status?: number }) =>
  request.get<unknown, HrmDepartment[]>('/hrm/departments', { params })

/** 部门树(下拉用) */
export const getDepartmentTree = () =>
  request.get<unknown, HrmDepartment[]>('/hrm/departments/tree')

export const createDepartment = (data: HrmDepartmentPayload) =>
  request.post('/hrm/departments', data)

export const updateDepartment = (id: number, data: HrmDepartmentPayload) =>
  request.put(`/hrm/departments/${id}`, data)

export const deleteDepartment = (id: number) => request.delete(`/hrm/departments/${id}`)

// ---------- 岗位 ----------

// 后端 /hrm/positions 返回 { list: HrmPosition[] }(非分页,但包了一层 list)
export const listPositions = (params?: { department_id?: number; status?: number }) =>
  request.get<unknown, { list: HrmPosition[] }>('/hrm/positions', { params })

/** 启用岗位(下拉用) */
export const listEnabledPositions = () =>
  request.get<unknown, HrmPosition[]>('/hrm/positions/enabled')

export const createPosition = (data: HrmPositionPayload) => request.post('/hrm/positions', data)

export const updatePosition = (id: number, data: HrmPositionPayload) =>
  request.put(`/hrm/positions/${id}`, data)

export const deletePosition = (id: number) => request.delete(`/hrm/positions/${id}`)

// ---------- 员工 ----------

export interface EmployeeQuery extends PageParams {
  keyword?: string
  department_id?: number
  position_id?: number
  status?: number
}

export const listEmployees = (params?: EmployeeQuery) =>
  request.get<unknown, HrmPageResult<HrmEmployee>>('/hrm/employees', { params })

export const createEmployee = (data: HrmEmployeePayload) => request.post('/hrm/employees', data)

export const updateEmployee = (id: number, data: HrmEmployeePayload) =>
  request.put(`/hrm/employees/${id}`, data)

export const deleteEmployee = (id: number) => request.delete(`/hrm/employees/${id}`)

/** 员工变更履历 */
export const getEmployeeChanges = (id: number) =>
  request.get<unknown, { list: HrmEmployeeChange[] }>(`/hrm/employees/${id}/changes`)

// ---------- 请假 ----------

export interface LeaveQuery extends PageParams {
  employee_id?: number
  status?: string
}

/** 请假列表 */
export const listLeaves = (params: LeaveQuery) =>
  request.get<unknown, HrmPageResult<HrmLeave>>('/hrm/attendance/leaves', { params })

/** 申请请假 */
export const applyLeave = (data: {
  employee_id: number
  leave_type: string
  start_date: string
  end_date: string
  duration_days: string
  reason?: string
}) => request.post<unknown, HrmLeave>('/hrm/attendance/leaves', data)

/** 旧审批(单审批人,兼容保留) */
export const approveLeave = (id: number, approved: boolean, remark?: string) =>
  request.put(`/hrm/attendance/leaves/${id}/approve`, { approved, remark })

/** 提交审批引擎(LEAVE 流程) */
export const submitLeaveApproval = (id: number) =>
  request.post('/approval/actions/push', { form_type: 'LEAVE', resource_id: id })

// ---------- 招聘职位 ----------

export interface JobQuery extends PageParams {
  keyword?: string
  status?: number
  dept_id?: number
}

export const listJobs = (params: JobQuery) =>
  request.get<unknown, HrmPageResult<HrmJob>>('/hrm/jobs', { params })

export const createJob = (data: {
  title: string
  dept_id?: number
  dept_name?: string
  headcount?: number
  salary_range?: string
  education?: string
  experience?: string
  description?: string
  requirement?: string
  hiring_manager_id?: number
}) => request.post<unknown, HrmJob>('/hrm/jobs', data)

export const updateJob = (id: number, data: Partial<Parameters<typeof createJob>[0]> & { status?: number }) =>
  request.put(`/hrm/jobs/${id}`, data)

export const deleteJob = (id: number) => request.delete(`/hrm/jobs/${id}`)

// ---------- 候选人 ----------

export interface CandidateQuery extends PageParams {
  job_id?: number
  status?: number
  keyword?: string
}

export const listCandidates = (params: CandidateQuery) =>
  request.get<unknown, HrmPageResult<HrmCandidate>>('/hrm/candidates', { params })

export const createCandidate = (data: {
  job_id: number
  name: string
  phone?: string
  email?: string
  gender?: string
  age?: number
  education?: string
  experience?: string
  company?: string
  resume_url?: string
  source?: string
  remark?: string
}) => request.post<unknown, HrmCandidate>('/hrm/candidates', data)

export const updateCandidate = (id: number, data: Partial<Parameters<typeof createCandidate>[0]> & { status?: number; interview_date?: string }) =>
  request.put(`/hrm/candidates/${id}`, data)

export const deleteCandidate = (id: number) => request.delete(`/hrm/candidates/${id}`)

// ---------- 绩效考核 ----------

export interface PerfQuery extends PageParams {
  keyword?: string
  period?: string
  status?: number
  employee_id?: number
  dept_id?: number
}

export const listPerformances = (params: PerfQuery) =>
  request.get<unknown, HrmPageResult<HrmPerformance>>('/hrm/performances', { params })

export const createPerformance = (data: {
  title: string
  employee_id: number
  employee_name?: string
  dept_id?: number
  dept_name?: string
  period?: string
  start_date: string
  end_date: string
  reviewer_id?: number
  items: { item_name: string; weight?: string; target_desc?: string }[]
}) => request.post('/hrm/performances', data)

export const selfReviewPerformance = (id: number, self_score: number, self_comment: string) =>
  request.put(`/hrm/performances/${id}/self-review`, { self_score, self_comment })

export const reviewPerformance = (id: number, data: { review_score: number; review_comment: string; final_score: number; grade: string }) =>
  request.put(`/hrm/performances/${id}/review`, data)

export const deletePerformance = (id: number) => request.delete(`/hrm/performances/${id}`)

// ---------- 考勤 ----------

export interface AttendanceSummaryQuery extends PageParams {
  year_month?: string
  department_id?: number
}

/** 考勤汇总列表 */
export const listAttendanceSummary = (params?: AttendanceSummaryQuery) =>
  request.get<unknown, HrmPageResult<HrmAttendanceSummary>>('/hrm/attendance/summary', { params })

// ---------- 排班管理(P14) ----------

export const listShifts = (params?: PageParams) =>
  request.get<unknown, HrmPageResult<HrmShift>>('/hrm/shifts', { params })

export const createShift = (data: { name: string; start_time: string; end_time: string; flex_minutes?: number; cross_day?: number; status?: number }) =>
  request.post('/hrm/shifts', data)

export const updateShift = (id: number, data: Parameters<typeof createShift>[0]) =>
  request.put(`/hrm/shifts/${id}`, data)

export const deleteShift = (id: number) => request.delete(`/hrm/shifts/${id}`)

export const listHolidays = (params?: PageParams & { year?: string }) =>
  request.get<unknown, HrmPageResult<HrmHoliday>>('/hrm/holidays', { params })

export const createHoliday = (data: { holiday_date: string; name: string; type: string }) =>
  request.post('/hrm/holidays', data)

export const updateHoliday = (id: number, data: { name: string; type: string }) =>
  request.put(`/hrm/holidays/${id}`, data)

export const deleteHoliday = (id: number) => request.delete(`/hrm/holidays/${id}`)

export const listAttendanceGroups = (params?: PageParams) =>
  request.get<unknown, HrmPageResult<HrmAttendanceGroup>>('/hrm/attendance-groups', { params })

export const createAttendanceGroup = (data: { name: string; dept_id?: number; shift_id: number; status?: number }) =>
  request.post('/hrm/attendance-groups', data)

export const updateAttendanceGroup = (id: number, data: Parameters<typeof createAttendanceGroup>[0]) =>
  request.put(`/hrm/attendance-groups/${id}`, data)

export const deleteAttendanceGroup = (id: number) =>
  request.delete(`/hrm/attendance-groups/${id}`)

export const listScheduleMonth = (month: string) =>
  request.get<unknown, { list: HrmScheduleMonthRow[] }>('/hrm/schedules/month', { params: { month } })

export const batchSchedule = (data: { employee_id: number; items: { date: string; shift_id: number }[] }) =>
  request.post('/hrm/schedules/batch', data)

export const deleteSchedule = (id: number) => request.delete(`/hrm/schedules/${id}`)

// ---------- 薪酬设置(P16) ----------

export interface InsurancePlanPayload {
  name: string
  pension_rate: number
  medical_rate: number
  unemployment_rate: number
  injury_rate: number
  maternity_rate: number
  fund_rate: number
  base_min?: number
  base_max?: number
  status?: number
}

export const listInsurancePlans = (params?: PageParams) =>
  request.get<unknown, HrmPageResult<InsurancePlanRow>>('/hrm/insurance-plans', { params })

export const createInsurancePlan = (data: InsurancePlanPayload) =>
  request.post('/hrm/insurance-plans', data)

export const updateInsurancePlan = (id: number, data: InsurancePlanPayload) =>
  request.put(`/hrm/insurance-plans/${id}`, data)

export const deleteInsurancePlan = (id: number) =>
  request.delete(`/hrm/insurance-plans/${id}`)

export interface InsurancePlanRow {
  id: number
  name: string
  pension_rate: string
  medical_rate: string
  unemployment_rate: string
  injury_rate: string
  maternity_rate: string
  fund_rate: string
  base_min: string | null
  base_max: string | null
  status: number
}

export interface SalaryItemPayload {
  code: string
  name: string
  kind: 'INCOME' | 'DEDUCT' | 'TAX'
  formula?: string
  fixed_amount?: number
  sort?: number
  status?: number
}

export const listSalaryItems = (params?: PageParams) =>
  request.get<unknown, HrmPageResult<SalaryItemRow>>('/hrm/salary-items', { params })

export const createSalaryItem = (data: SalaryItemPayload) =>
  request.post('/hrm/salary-items', data)

export const updateSalaryItem = (id: number, data: SalaryItemPayload) =>
  request.put(`/hrm/salary-items/${id}`, data)

export const deleteSalaryItem = (id: number) =>
  request.delete(`/hrm/salary-items/${id}`)

export interface SalaryItemRow {
  id: number
  code: string
  name: string
  kind: 'INCOME' | 'DEDUCT' | 'TAX'
  formula: string
  fixed_amount: string
  sort: number
  status: number
}

/** 保存薪酬结构(v2:支持挂社保方案) */
export const saveSalaryStructureV2 = (data: {
  employee_id: number
  base_salary?: number
  position_allowance?: number
  performance_allowance?: number
  meal_allowance?: number
  transport_allowance?: number
  social_ins_rate?: number
  housing_fund_rate?: number
  social_ins_base?: number
  housing_fund_base?: number
  plan_id?: number
  remark?: string
}) => request.put('/hrm/payroll/structure/v2', data)
