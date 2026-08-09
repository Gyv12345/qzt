import { BellOutlined, CheckOutlined, ReloadOutlined } from '@ant-design/icons'
import { Badge, Button, Empty, List, Popover, Space, Spin, Tag, Tooltip, Typography } from 'antd'
import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUnreadCount, listInbox, markAllMessagesRead, markMessageRead } from '../../services/enterprise'
import type { EntMessage } from '../../types/enterprise'
import { useNotificationStore } from '../../stores/notification'

/**
 * 通知消息盒子(顶部铃铛)。
 * - Badge 数字从全局 notification store 获取(SSE 实时更新)
 * - 打开弹窗拉历史收件箱
 * - 支持单条已读 / 全部已读
 */
export default function MessageBox() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<EntMessage[]>([])
  const { unreadCount, setUnreadCount, decrement } = useNotificationStore()

  // 初始加载未读数
  useEffect(() => {
    getUnreadCount().then((res) => setUnreadCount(res.unread_count || 0)).catch(() => {})
  }, [setUnreadCount])

  const loadMessages = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listInbox({ page: 1, page_size: 20 })
      setItems(res.list || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) loadMessages()
  }, [open, loadMessages])

  const handleMarkAllRead = async () => {
    try {
      await markAllMessagesRead()
      setItems((prev) => prev.map((i) => ({ ...i, is_read: 1 })))
      setUnreadCount(0)
    } catch {
      // ignore
    }
  }

  const handleMarkRead = async (id: number) => {
    try {
      await markMessageRead(id)
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_read: 1 } : i)))
      decrement()
    } catch {
      // ignore
    }
  }

  const content = (
    <div style={{ width: 340 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Typography.Text strong>消息盒子</Typography.Text>
        <Space size={4}>
          <Button type="link" size="small" icon={<ReloadOutlined />} onClick={loadMessages}>刷新</Button>
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={handleMarkAllRead} disabled={unreadCount === 0}>全部已读</Button>
        </Space>
      </div>
      <Spin spinning={loading}>
        <div style={{ maxHeight: 360, overflowY: 'auto' }}>
          {items.length ? (
            <List
              size="small"
              dataSource={items}
              renderItem={(item) => (
                <List.Item
                  style={{ cursor: 'pointer', background: item.is_read ? undefined : 'rgba(22,119,255,0.04)' }}
                  onClick={() => {
                    if (item.is_read === 0) handleMarkRead(item.id)
                    // 根据标题跳转
                    if (item.title?.includes('审批') || item.title?.includes('待办')) {
                      navigate('/approval/todo')
                      setOpen(false)
                    } else if (item.title?.includes('公告') || item.title?.includes('通知')) {
                      navigate('/oa/notice')
                      setOpen(false)
                    }
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: item.is_read ? 400 : 600 }}>{item.title}</div>
                    <div style={{ color: 'rgba(0,0,0,0.65)', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.content}
                    </div>
                    <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                      {item.created_at?.slice(0, 16)}
                    </div>
                  </div>
                  {item.is_read === 0 && <Tag color="error">未读</Tag>}
                </List.Item>
              )}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无消息" />
          )}
        </div>
      </Spin>
    </div>
  )

  return (
    <Popover
      placement="bottomRight"
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      content={content}
      arrow={false}
      overlayInnerStyle={{ padding: 12 }}
    >
      <Tooltip title="消息通知">
        <Badge count={unreadCount} size="small" offset={[-5, 5]} overflowCount={99}>
          <Button type="text" className="qzt-header-icon" icon={<BellOutlined />} aria-label="消息通知" />
        </Badge>
      </Tooltip>
    </Popover>
  )
}
