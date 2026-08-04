import { rawRequest } from '../utils/request'
import type { PageParams } from '../types'
import type { CmsArticle } from '../types/cms'

interface CmsPageResult<T> {
  list: T[]
  total: number
}

export interface ArticleQuery extends PageParams {
  keyword?: string
}

/** 公开资讯列表(免鉴权,走 /cms/public) */
export const listPublicArticles = (params: ArticleQuery) =>
  rawRequest
    .get<{ code: number; data: CmsPageResult<CmsArticle> }>('/cms/public/articles', { params })
    .then((res) => res.data.data)

/** 资讯详情(免鉴权) */
export const getPublicArticle = (id: number) =>
  rawRequest
    .get<{ code: number; data: CmsArticle }>(`/cms/public/articles/${id}`)
    .then((res) => res.data.data)
