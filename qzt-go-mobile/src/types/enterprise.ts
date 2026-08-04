// 企业管理模块类型(移动端子集:消息/公告),与 qzt-go-server enterprise 模型对齐

export interface EntMessage {
  id: number
  /** 发送人ID(系统消息=0) */
  sender_id: number
  receiver_id: number
  title: string
  content: string
  /** 0未读 1已读 */
  is_read: number
  read_time: string
  created_at: string
  updated_at: string
}

export interface EntNotice {
  id: number
  title: string
  content: string
  /** 1通知 2公告 */
  type: number
  /** 0草稿 1发布 */
  status: number
  publish_time: string
  created_at: string
  updated_at: string
}
