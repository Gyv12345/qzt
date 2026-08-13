import request from '../utils/request'
import type { PageParams } from '../types'
import type { EntMessage, EntNotice } from '../types/enterprise'

interface EntPageResult<T> {
  list: T[]
  total: number
}

export interface MessageQuery extends PageParams {}

/** 收件箱 */
export const listInbox = (params: MessageQuery) =>
  request.get<unknown, EntPageResult<EntMessage>>('/oa/messages/inbox', { params })

/** 未读消息数 */
export const getUnreadCount = () =>
  request.get<unknown, { unread_count: number }>('/oa/messages/unread-count')

/** 标记已读 */
export const markRead = (id: number) => request.put(`/oa/messages/${id}/read`)

/** 全部已读 */
export const markAllRead = () => request.put('/oa/messages/read-all')

/** 已发布公告列表 */
export const listNotices = (params: PageParams) =>
  request.get<unknown, EntPageResult<EntNotice>>('/oa/notices/published', { params })

/** 发件箱 */
export const listOutbox = (params: MessageQuery) =>
  request.get<unknown, EntPageResult<EntMessage>>('/oa/messages/outbox', { params })

/** 发送站内信 */
export const sendMessage = (data: { receiver_id: number; title: string; content: string }) =>
  request.post('/oa/messages', data)

/** 删除站内信 */
export const deleteMessage = (id: number) => request.delete(`/oa/messages/${id}`)
