import request from '../utils/request'
import type { PageParams } from '../types'
import type {
  CmsArticle,
  CmsArticlePayload,
  CmsCategory,
  CmsCategoryPayload,
  CmsPage,
  CmsPagePayload,
  CmsTag,
  CmsTagPayload,
} from '../types/cms'
import type { CrmPageResult } from './crm'

// ---------- 文章管理 ----------

export interface ArticleQuery extends PageParams {
  keyword?: string
  category_id?: number
  status?: number
  tag_id?: number
}

export const listArticles = (params?: ArticleQuery) =>
  request.get<unknown, CrmPageResult<CmsArticle>>('/cms/articles', { params })

export const getArticle = (id: number) => request.get<unknown, CmsArticle>(`/cms/articles/${id}`)

export const createArticle = (data: CmsArticlePayload) => request.post('/cms/articles', data)

export const updateArticle = (id: number, data: CmsArticlePayload) =>
  request.put(`/cms/articles/${id}`, data)

export const deleteArticle = (id: number) => request.delete(`/cms/articles/${id}`)

// ---------- 分类管理 ----------

export const listCategories = (params?: PageParams & { keyword?: string }) =>
  request.get<unknown, CrmPageResult<CmsCategory>>('/cms/categories', { params })

export const getCategoryTree = () => request.get<unknown, CmsCategory[]>('/cms/categories/all')

export const createCategory = (data: CmsCategoryPayload) => request.post('/cms/categories', data)

export const updateCategory = (id: number, data: CmsCategoryPayload) =>
  request.put(`/cms/categories/${id}`, data)

export const deleteCategory = (id: number) => request.delete(`/cms/categories/${id}`)

// ---------- 单页管理 ----------

export const listPages = (params?: PageParams & { keyword?: string }) =>
  request.get<unknown, CrmPageResult<CmsPage>>('/cms/pages', { params })

export const createPage = (data: CmsPagePayload) => request.post('/cms/pages', data)

export const updatePage = (id: number, data: CmsPagePayload) =>
  request.put(`/cms/pages/${id}`, data)

export const deletePage = (id: number) => request.delete(`/cms/pages/${id}`)

// ---------- 标签管理 ----------

export const listTags = (params?: PageParams & { keyword?: string }) =>
  request.get<unknown, CrmPageResult<CmsTag>>('/cms/tags', { params })

export const listAllTags = () => request.get<unknown, CmsTag[]>('/cms/tags/all')

export const createTag = (data: CmsTagPayload) => request.post('/cms/tags', data)

export const updateTag = (id: number, data: CmsTagPayload) => request.put(`/cms/tags/${id}`, data)

export const deleteTag = (id: number) => request.delete(`/cms/tags/${id}`)
