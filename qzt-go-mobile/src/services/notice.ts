import request from '../utils/request'
import type { OaNotice } from '../types/crm'

/** 已发布公告列表(type: 0全部 1通知 2公告) */
export const listNotices = (type = 0, limit = 20) =>
  request.get<unknown, OaNotice[]>('/oa/notices/published', { params: { type, limit } })

/** 公告详情 */
export const getNotice = (id: number) => request.get<unknown, OaNotice>(`/oa/notices/${id}`)
