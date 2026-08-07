import request from '../utils/request'
import type {
  HrmCandidate,
  HrmDepartment,
  HrmDepartmentPayload,
  HrmEmployee,
  HrmEmployeeChange,
  HrmEmployeePayload,
  HrmJob,
  HrmLeave,
  HrmPerformance,
  HrmPosition,
  HrmPositionPayload,
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
