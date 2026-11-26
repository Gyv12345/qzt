import request from '../utils/request'
import type { PageParams } from '../types'
import type { MpAccount, MpArticle, MpMenuItem, MpMenuState } from '../types/mp'

// 公众号运营中心服务层:账号管理 / 文章(AI 生成 + 推送草稿箱) / 自定义菜单。
// AI 生成与推送草稿箱耗时明显长于普通接口,单独放宽超时并静默(silent),
// 业务错误(微信侧配置缺失/接口失败等)由调用方 catch 后 message.error 呈现。

// ---------- 公众号账号 ----------

export interface MpAccountPayload {
  name: string
  account_type: 'sub' | 'srv'
  app_id: string
  /** 更新时留空表示不修改(后端按 **** 开头识别) */
  app_secret?: string
  /** 1启用 0禁用 */
  enabled?: number
}

export const listAccounts = (): Promise<MpAccount[]> =>
  request.get<unknown, { list: MpAccount[] }>('/mp/accounts').then((res) => res.list ?? [])

export const createAccount = (data: MpAccountPayload) =>
  request.post<unknown, MpAccount>('/mp/accounts', data)

export const updateAccount = (id: number, data: MpAccountPayload) =>
  request.put<unknown, MpAccount>(`/mp/accounts/${id}`, data)

export const deleteAccount = (id: number) => request.delete<unknown, void>(`/mp/accounts/${id}`)

// ---------- 文章管理 ----------

export interface MpArticleQuery extends PageParams {
  account_id?: number
  status?: string
  keyword?: string
}

export interface MpArticlePayload {
  account_id: number
  title?: string
  digest?: string
  author?: string
  cover_url?: string
  theme?: string
  points?: string
  content_md?: string
}

export const listArticles = (params?: MpArticleQuery) =>
  request.get<unknown, { list: MpArticle[]; total: number }>('/mp/articles', { params })

export const getArticle = (id: number) => request.get<unknown, MpArticle>(`/mp/articles/${id}`)

export const createArticle = (data: MpArticlePayload) =>
  request.post<unknown, MpArticle>('/mp/articles', data)

export const updateArticle = (id: number, data: MpArticlePayload) =>
  request.put<unknown, MpArticle>(`/mp/articles/${id}`, data)

export const deleteArticle = (id: number) => request.delete<unknown, void>(`/mp/articles/${id}`)

/** AI 生成超时:模型生成耗时明显长于普通接口,与 AI 场景同标准放宽 */
const AI_GENERATE_TIMEOUT = 120000

/**
 * AI 生成文章并落库(覆盖标题/摘要/正文)。静默模式:业务错误由页面自行 message.error 呈现。
 */
export const generateArticle = (
  id: number,
  data?: { theme?: string; points?: string; use_kb?: boolean },
): Promise<MpArticle> =>
  request.post<unknown, MpArticle>(`/mp/articles/${id}/generate`, data, {
    silent: true,
    timeout: AI_GENERATE_TIMEOUT,
  })

/** 推送草稿箱超时:微信接口偶发慢,放宽到 60s;静默模式同上 */
const PUSH_DRAFT_TIMEOUT = 60000

/** 推送到微信草稿箱(发布仍在 mp.weixin.qq.com 人工点击)。静默模式:失败原因由页面呈现 */
export const pushArticleDraft = (
  id: number,
): Promise<{ media_id: string; message: string }> =>
  request.post<unknown, { media_id: string; message: string }>(
    `/mp/articles/${id}/push-draft`,
    undefined,
    { silent: true, timeout: PUSH_DRAFT_TIMEOUT },
  )

// ---------- 自定义菜单 ----------

export const getAccountMenu = (id: number) =>
  request.get<unknown, MpMenuState>(`/mp/accounts/${id}/menu`)

export const saveAccountMenu = (id: number, buttons: MpMenuItem[]) =>
  request.put<unknown, void>(`/mp/accounts/${id}/menu`, { buttons })

export const deleteAccountMenu = (id: number) =>
  request.delete<unknown, void>(`/mp/accounts/${id}/menu`)
