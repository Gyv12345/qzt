import request from '../utils/request'
import type { PageParams } from '../types'
import type {
  HrmEmployee,
  HrmLeave,
  HrmClockRecord,
  HrmDepartment,
  HrmPosition,
  HrmPerformance,
  HrmPerfItem,
  HrmJob,
  HrmCandidate,
  HrmAttendanceSummary,
  HrmPayroll,
  HrmSalaryStructure,
} from '../types/hrm'

interface PageResult<T> { list: T[]; total: number }

// ── 员工 ──

export interface EmployeeQuery extends PageParams {
  keyword?: string
  department_id?: number
  status?: number
}

export const listEmployees = (params: EmployeeQuery) =>
  request.get<unknown, PageResult<HrmEmployee>>('/hrm/employees', { params })

export const getEmployee = (id: number) =>
  request.get<unknown, HrmEmployee>(`/hrm/employees/${id}`)

/** 新建员工 */
export const createEmployee = (data: {
  name: string
  emp_no?: string
  phone?: string
  gender?: number
  department_id?: number
  position_id?: number
  status?: number
  entry_date?: string
  id_card?: string
  email?: string
}) => request.post('/hrm/employees', data)

/** 更新员工(亦可用于入职/离职:改 status) */
export const updateEmployee = (
  id: number,
  data: Partial<Parameters<typeof createEmployee>[0]>,
) => request.put(`/hrm/employees/${id}`, data)

/** 删除员工 */
export const deleteEmployee = (id: number) => request.delete(`/hrm/employees/${id}`)

// ── 请假 ──

export interface LeaveQuery extends PageParams {
  status?: string
}

export const listLeaves = (params: LeaveQuery) =>
  request.get<unknown, PageResult<HrmLeave>>('/hrm/attendance/leaves', { params })

/** 申请请假 */
export const applyLeave = (data: {
  employee_id: number
  leave_type: string
  start_date: string
  end_date: string
  duration_days: string
  reason?: string
}) => request.post('/hrm/attendance/leaves', data)

export const submitLeaveApproval = (id: number) =>
  request.post('/approval/actions/push', { form_type: 'LEAVE', resource_id: id })

// ── 考勤打卡 ──

/** 打卡(employee_id 后端自动从登录态推导;不采集定位) */
export const clockIn = (data: { clock_type: 'CHECK_IN' | 'CHECK_OUT'; remark?: string }) =>
  request.post<unknown, HrmClockRecord>('/hrm/attendance/clock', data)

/** 我的打卡记录(不传 employee_id 后端取当前用户) */
export const listMyClocks = (params: { start_date?: string; end_date?: string }) =>
  request.get<unknown, HrmClockRecord[]>('/hrm/attendance/clocks', { params })

// ── 部门 ──

export const listDepartments = (params?: { keyword?: string; status?: number }) =>
  request.get<unknown, { list: HrmDepartment[] }>('/hrm/departments', { params })

export const getDepartmentTree = () =>
  request.get<unknown, HrmDepartment[]>('/hrm/departments/tree')

export const getDepartment = (id: number) =>
  request.get<unknown, HrmDepartment>(`/hrm/departments/${id}`)

export const createDepartment = (data: {
  name: string
  code: string
  parent_id?: number
  leader_id?: number
  sort?: number
  status?: number
}) => request.post('/hrm/departments', data)

export const updateDepartment = (id: number, data: Partial<Parameters<typeof createDepartment>[0]>) =>
  request.put(`/hrm/departments/${id}`, data)

export const deleteDepartment = (id: number) => request.delete(`/hrm/departments/${id}`)

// ── 岗位 ──

export const listPositions = (params?: { department_id?: number; status?: number }) =>
  request.get<unknown, { list: HrmPosition[] }>('/hrm/positions', { params })

export const listEnabledPositions = () =>
  request.get<unknown, HrmPosition[]>('/hrm/positions/enabled')

export const createPosition = (data: {
  name: string
  code: string
  department_id: number
  sort?: number
  status?: number
  remark?: string
}) => request.post('/hrm/positions', data)

export const updatePosition = (id: number, data: Partial<Parameters<typeof createPosition>[0]>) =>
  request.put(`/hrm/positions/${id}`, data)

export const deletePosition = (id: number) => request.delete(`/hrm/positions/${id}`)

// ── 绩效 ──

export interface PerfQuery extends PageParams {
  keyword?: string
  period?: string
  status?: number
  employee_id?: number
  dept_id?: number
}

export const listPerformances = (params: PerfQuery) =>
  request.get<unknown, PageResult<HrmPerformance>>('/hrm/performances', { params })

export const getPerformance = (id: number) =>
  request.get<unknown, { performance: HrmPerformance; items: HrmPerfItem[] }>(`/hrm/performances/${id}`)

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
  items?: { item_name: string; weight?: string; target_desc?: string }[]
}) => request.post('/hrm/performances', data)

export const selfReviewPerformance = (id: number, data: { self_score: string; self_comment?: string }) =>
  request.put(`/hrm/performances/${id}/self-review`, data)

export const reviewPerformance = (
  id: number,
  data: { review_score?: string; review_comment?: string; final_score?: string; grade?: string },
) => request.put(`/hrm/performances/${id}/review`, data)

export const deletePerformance = (id: number) => request.delete(`/hrm/performances/${id}`)

// ── 招聘职位 ──

export interface JobQuery extends PageParams {
  keyword?: string
  status?: number
  dept_id?: number
}

export const listJobs = (params: JobQuery) =>
  request.get<unknown, PageResult<HrmJob>>('/hrm/jobs', { params })

export const getJob = (id: number) =>
  request.get<unknown, HrmJob>(`/hrm/jobs/${id}`)

export const createJob = (data: {
  title: string
  dept_id?: number
  dept_name?: string
  position_id?: number
  headcount?: number
  salary_range?: string
  education?: string
  experience?: string
  description?: string
  requirement?: string
  hiring_manager_id?: number
}) => request.post('/hrm/jobs', data)

export const updateJob = (
  id: number,
  data: Partial<Parameters<typeof createJob>[0]> & { status?: number },
) => request.put(`/hrm/jobs/${id}`, data)

export const deleteJob = (id: number) => request.delete(`/hrm/jobs/${id}`)

// ── 招聘候选人 ──

export interface CandidateQuery extends PageParams {
  job_id?: number
  status?: number
  keyword?: string
}

export const listCandidates = (params: CandidateQuery) =>
  request.get<unknown, PageResult<HrmCandidate>>('/hrm/candidates', { params })

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
}) => request.post('/hrm/candidates', data)

export const updateCandidate = (
  id: number,
  data: Partial<Parameters<typeof createCandidate>[0]> & {
    status?: number
    interview_date?: string
    evaluator_id?: number
  },
) => request.put(`/hrm/candidates/${id}`, data)

export const deleteCandidate = (id: number) => request.delete(`/hrm/candidates/${id}`)

// ── 考勤月度汇总 ──

export const listAttendanceSummary = (params: { year_month?: string; department_id?: number }) =>
  request.get<unknown, HrmAttendanceSummary[]>('/hrm/attendance/summary', { params })

export const generateAttendanceSummary = (employee_id: number, year_month: string) =>
  request.post<unknown, HrmAttendanceSummary>('/hrm/attendance/summary/generate', null, {
    params: { employee_id, year_month },
  })

// ── 薪资 ──

export const listPayroll = (params: { year_month?: string; department_id?: number }) =>
  request.get<unknown, HrmPayroll[]>('/hrm/payroll', { params })

export const generatePayroll = (data: { employee_id: number; year_month: string }) =>
  request.post<unknown, HrmPayroll>('/hrm/payroll/generate', data)

export const confirmPayroll = (id: number) => request.put(`/hrm/payroll/${id}/confirm`)

export const markPayrollPaid = (id: number) => request.put(`/hrm/payroll/${id}/paid`)

export const getSalaryStructure = (employee_id: number) =>
  request.get<unknown, HrmSalaryStructure>('/hrm/payroll/structure', { params: { employee_id } })

export const saveSalaryStructure = (data: {
  employee_id: number
  base_salary?: string
  position_allowance?: string
  performance_allowance?: string
  meal_allowance?: string
  transport_allowance?: string
  social_ins_rate?: string
  housing_fund_rate?: string
  social_ins_base?: string
  housing_fund_base?: string
  remark?: string
}) => request.put('/hrm/payroll/structure', data)
