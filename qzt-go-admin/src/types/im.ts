// IM 即时通讯 API 契约类型,与 qzt-go-server /im 模块定义保持一致

/** 单条 IM 消息(content_type 当前仅 text,后续扩展在此追加) */
export interface ImMessage {
  id: number
  conversation_id: number
  sender_id: number
  sender_name: string
  sender_avatar: string
  content_type: 'text'
  content: string
  created_at: string
}

/** 单聊会话的对方用户信息(仅 single 会话有值) */
export interface ImConversationPeer {
  id: number
  nickname: string
  avatar: string
}

/** 会话(type=single 时 name 为对方昵称,type=group 时为群名) */
export interface ImConversation {
  id: number
  type: 'single' | 'group'
  name: string
  owner_id: number
  member_count: number
  /** 仅 single 会话有值 */
  peer: ImConversationPeer | null
  unread: number
  last_message: ImMessage | null
  last_message_at: string | null
}

/** SSE 流(GET /oa/messages/stream)event: im_message 的 data 载荷(JSON 字符串) */
export interface ImSSEPayload {
  conversation_id: number
  conv_type: 'single' | 'group'
  conv_name: string
  message: ImMessage
}
