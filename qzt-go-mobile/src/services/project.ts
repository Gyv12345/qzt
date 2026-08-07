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
