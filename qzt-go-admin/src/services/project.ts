import request from '../utils/request'
import type { PageParams, PageResult } from '../types'
import type { ProjProject, ProjTask, ProjectDetail } from '../types/project'

export interface ProjectQuery extends PageParams {
  keyword?: string
  status?: number
  priority?: number
  manager_id?: number
}

export const listProjects = (params: ProjectQuery) =>
  request.get<unknown, PageResult<ProjProject>>('/project/projects', { params })

export const getProject = (id: number) =>
  request.get<unknown, ProjectDetail>(`/project/projects/${id}`)

export const createProject = (data: {
  name: string
  description?: string
  customer_id?: number
  customer_name?: string
  contract_id?: number
  manager_id?: number
  priority?: number
  start_date?: string
  end_date?: string
  tags?: string
}) => request.post<unknown, ProjProject>('/project/projects', data)

export const updateProject = (id: number, data: Partial<Parameters<typeof createProject>[0]> & {
  status?: number
  progress?: number
  member_ids?: string
}) => request.put(`/project/projects/${id}`, data)

export const deleteProject = (id: number) => request.delete(`/project/projects/${id}`)

// ── 任务 ──

export const listTasks = (projectId: number) =>
  request.get<unknown, ProjTask[]>('/project/tasks', { params: { project_id: projectId } })

export const createTask = (data: {
  project_id: number
  title: string
  description?: string
  assignee_id?: number
  priority?: number
  due_date?: string
}) => request.post<unknown, ProjTask>('/project/tasks', data)

export const updateTask = (id: number, data: {
  title: string
  description?: string
  assignee_id?: number
  status?: number
  priority?: number
  sort_order?: number
  due_date?: string
}) => request.put(`/project/tasks/${id}`, data)

export const updateTaskStatus = (id: number, status: number) =>
  request.put(`/project/tasks/${id}/status`, { status })

export const deleteTask = (id: number) => request.delete(`/project/tasks/${id}`)
