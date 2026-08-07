import request from '../utils/request'
import type { PageParams } from '../types'
import type { HrmEmployee, HrmLeave } from '../types/hrm'

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

// ── 请假 ──

export interface LeaveQuery extends PageParams {
  status?: string
}

export const listLeaves = (params: LeaveQuery) =>
  request.get<unknown, PageResult<HrmLeave>>('/hrm/attendance/leaves', { params })

export const submitLeaveApproval = (id: number) =>
  request.post('/approval/actions/push', { form_type: 'LEAVE', resource_id: id })
