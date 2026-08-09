import request from '../utils/request'
import type { PageParams } from '../types'
import type { KbCategory, KbDocument, KbVersion } from '../types/kb'

interface PageResult<T> { list: T[]; total: number }

// ── 分类 ──

export const listCategories = () =>
  request.get<unknown, { list: KbCategory[] }>('/kb/categories')

export const createCategory = (data: { parent_id?: number; name: string; sort?: number }) =>
  request.post('/kb/categories', data)

export const updateCategory = (id: number, data: { parent_id?: number; name: string; sort?: number }) =>
  request.put(`/kb/categories/${id}`, data)

export const deleteCategory = (id: number) =>
  request.delete(`/kb/categories/${id}`)

// ── 文档 ──

export interface DocQuery extends PageParams {
  category_id?: number
  keyword?: string
  status?: string
}

export const listDocuments = (params?: DocQuery) =>
  request.get<unknown, PageResult<KbDocument>>('/kb/documents', { params })

export const getDocument = (id: number) =>
  request.get<unknown, KbDocument>(`/kb/documents/${id}`)

export const createDocument = (data: { category_id?: number; title: string; content?: string; status?: string }) =>
  request.post<unknown, KbDocument>('/kb/documents', data)

export const updateDocument = (id: number, data: { category_id?: number; title?: string; content?: string; status?: string }) =>
  request.put(`/kb/documents/${id}`, data)

export const deleteDocument = (id: number) =>
  request.delete(`/kb/documents/${id}`)

// ── 版本 ──

export const listVersions = (docId: number, params?: PageParams) =>
  request.get<unknown, PageResult<KbVersion>>(`/kb/documents/${docId}/versions`, { params })

export const restoreVersion = (docId: number, versionId: number) =>
  request.put(`/kb/documents/${docId}/versions/${versionId}/restore`)
