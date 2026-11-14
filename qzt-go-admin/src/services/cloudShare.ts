import { isAxiosError } from 'axios'
import request from '../utils/request'
import type { CloudShare, CloudShareCreated, CloudShareMeta } from '../types/cloud'

// ── 网盘分享 ──

/** 创建分享(仅文件;expire_days: 7|30;extract_code 留空表示无提取码) */
export const createShare = (data: { file_id: number; expire_days: number; extract_code?: string }) =>
  request.post<unknown, CloudShareCreated>('/cloud/shares', data)

/** 我的分享列表(分页) */
export const listShares = (params: { page?: number; page_size?: number }) =>
  request.get<unknown, { list: CloudShare[]; total: number }>('/cloud/shares', { params })

/** 取消分享 */
export const cancelShare = (id: number) => request.delete<unknown, boolean>(`/cloud/shares/${id}`)

/** 公开分享元信息(免登录;silent:失败由页面自行提示) */
export const getShareMeta = (token: string) =>
  request.get<unknown, CloudShareMeta>(`/cloud/public/shares/${token}`, { silent: true })

/** 公开获取下载链接(免登录;silent:失败由页面自行提示) */
export const downloadShare = (token: string, data: { code?: string }) =>
  request.post<unknown, { download_url: string }>(`/cloud/public/shares/${token}/download`, data, { silent: true })

/** 是否命中频控(429;公开下载接口有 IP 频控) */
export function isRateLimited(e: unknown): boolean {
  if (!isAxiosError(e)) return false
  const status = e.response?.status
  const code = (e.response?.data as { code?: number } | undefined)?.code
  return status === 429 || code === 429
}

/** 把分享接口的错误转成用户可读文案(rateText: 频控时的提示) */
export function shareErrMsg(e: unknown, fallback: string, rateText = '下载过于频繁,请稍后再试'): string {
  if (isRateLimited(e)) return rateText
  if (e instanceof Error && e.message) return e.message
  return fallback
}
