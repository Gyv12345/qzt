import request from '../utils/request'
import type {
  HrmDepartment,
  HrmDepartmentPayload,
  HrmEmployee,
  HrmEmployeeChange,
  HrmEmployeePayload,
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
