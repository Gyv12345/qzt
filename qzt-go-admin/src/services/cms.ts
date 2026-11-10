import request from '../utils/request'
import type { PageParams } from '../types'
import type {
  CmsArticle,
  CmsArticlePayload,
  CmsCategory,
  CmsCategoryPayload,
  CmsPage,
  CmsPagePayload,
  CmsPushLog,
  CmsPushResult,
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

// ---------- 文章版本快照与回滚(P20) ----------

export interface ArticleVersion {
  id: number
  article_id: number
  version_no: number
  title: string
  summary: string
  content: string
  cover_url: string
  editor_name: string
  created_at: string
}

export const listArticleVersions = (id: number) =>
  request.get<unknown, { list: ArticleVersion[]; total: number }>(`/cms/articles/${id}/versions`)

export const rollbackArticleVersion = (id: number, versionId: number) =>
  request.post<unknown, CmsArticle>(`/cms/articles/${id}/versions/${versionId}/rollback`)

// ---------- 媒体库(P22) ----------

export interface MediaItem {
  key: string
  size: number
  last_modified: string
  url: string
  is_image: boolean
}

export const listMedia = (params?: { keyword?: string; max_keys?: number }) =>
  request.get<unknown, MediaItem[]>('/cms/media', { params })

export const deleteMedia = (objectKeys: string[]) =>
  request.post<unknown, { deleted: string[]; failed: string[] }>('/cms/media/delete', {
    object_keys: objectKeys,
  })

// ---------- 搜索引擎推送 ----------

export interface PushPayload {
  /** 完整 URL(会被域名白名单过滤) */
  urls?: string[]
  /** 文章ID(按 slug 拼公开链接,无 slug 自动跳过) */
  article_ids?: number[]
}

export const pushBaidu = (data: PushPayload) =>
  request.post<unknown, CmsPushResult>('/cms/push/baidu', data)

export const pushIndexNow = (data: PushPayload) =>
  request.post<unknown, CmsPushResult>('/cms/push/indexnow', data)

export const listPushLogs = (params?: PageParams & { channel?: string }) =>
  request.get<unknown, CrmPageResult<CmsPushLog>>('/cms/push/logs', { params })

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

// ---------- 访问统计(官网埋点) ----------

export interface TrackDatePoint {
  date: string
  pv: number
  uv: number
}

export interface TrackNameCount {
  name: string
  count: number
}

export interface TrackSummary {
  pv: number
  uv: number
  today_pv: number
  today_uv: number
  yesterday_pv: number
  yesterday_uv: number
  daily: TrackDatePoint[]
  top_pages: TrackNameCount[]
  top_events: TrackNameCount[]
  top_referrers: TrackNameCount[]
}

export interface CmsTrackEvent {
  id: number
  event: string
  path: string
  title: string
  referrer: string
  visitor_id: string
  session_id: string
  props: string
  ip: string
  ua: string
  created_at: string
}

export const getTrackSummary = (days: number) =>
  request.get<unknown, TrackSummary>('/cms/track/summary', { params: { days } })

export const listTrackEvents = (params?: PageParams & { days?: number; event?: string }) =>
  request.get<unknown, CrmPageResult<CmsTrackEvent>>('/cms/track/list', { params })
