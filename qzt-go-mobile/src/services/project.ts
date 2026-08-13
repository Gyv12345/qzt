import request from '../utils/request'
import type { PageParams } from '../types'
import type { ProjProject, ProjectDetail, ProjTask } from '../types/project'

interface PageResult<T> { list: T[]; total: number }

export interface ProjectQuery extends PageParams {
  keyword?: string
  status?: number
}

export const listProjects = (params: ProjectQuery) =>
  request.get<unknown, PageResult<ProjProject>>('/project/projects', { params })

export const getProject = (id: number) =>
  request.get<unknown, ProjectDetail>(`/project/projects/${id}`)

export const listTasks = (projectId: number) =>
  request.get<unknown, ProjTask[]>('/project/tasks', { params: { project_id: projectId } })

export const updateTaskStatus = (id: number, status: number) =>
  request.put(`/project/tasks/${id}/status`, { status })

// ── 项目 CRUD(补充) ──

export const createProject = (data: {
  name: string
  description?: string
  start_date?: string
  end_date?: string
  customer_id?: number
  status?: number
}) => request.post('/project/projects', data)

export const updateProject = (id: number, data: Partial<Parameters<typeof createProject>[0]>) =>
  request.put(`/project/projects/${id}`, data)

export const deleteProject = (id: number) => request.delete(`/project/projects/${id}`)

// ── 任务增删(补充) ──

export const createTask = (data: { project_id: number; title: string; description?: string; due_date?: string; status?: number }) =>
  request.post('/project/tasks', data)

export const deleteTask = (id: number) => request.delete(`/project/tasks/${id}`)
