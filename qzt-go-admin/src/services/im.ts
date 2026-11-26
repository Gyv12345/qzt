import request from '../utils/request'
import type { ImConversation, ImMessage } from '../types/im'

// IM 即时通讯服务(后端 /im 模块)。信封已由拦截器解包,直接返回 data。

/** 会话列表(后端已按 last_message_at DESC 排序) */
export const listConversations = () => request.get<unknown, ImConversation[]>('/im/conversations')

/** 创建/获取与目标用户的单聊会话(已存在则直接返回既有会话) */
export const createSingleConversation = (targetUserId: number) =>
  request.post<unknown, ImConversation>('/im/conversations/single', {
    target_user_id: targetUserId,
  })

/** 创建群聊 */
export const createGroupConversation = (name: string, memberIds: number[]) =>
  request.post<unknown, ImConversation>('/im/conversations/group', {
    name,
    member_ids: memberIds,
  })

/**
 * 历史消息(按 id DESC 返回,取 PAGE_SIZE 条)。
 * 向上翻页传 before_id = 当前已加载最早一条消息的 id。
 */
export const listMessages = (conversationId: number, beforeId?: number, limit = 20) =>
  request.get<unknown, ImMessage[]>(`/im/conversations/${conversationId}/messages`, {
    params: { before_id: beforeId, limit },
  })

/** 发送文本消息(同步返回落库后的 ImMessage,直接追加即可,无需乐观 UI) */
export const sendMessage = (conversationId: number, content: string) =>
  request.post<unknown, ImMessage>(`/im/conversations/${conversationId}/messages`, { content })

/** 标记会话已读 */
export const markConversationRead = (conversationId: number) =>
  request.put<unknown, { last_read_message_id: number }>(
    `/im/conversations/${conversationId}/read`,
    {},
  )

/** 群加人 */
export const addConversationMembers = (conversationId: number, userIds: number[]) =>
  request.post<unknown, { added: number }>(
    `/im/conversations/${conversationId}/members`,
    { user_ids: userIds },
  )

/** 群移人 */
export const removeConversationMember = (conversationId: number, userId: number) =>
  request.delete<unknown, { removed: boolean }>(
    `/im/conversations/${conversationId}/members/${userId}`,
  )
