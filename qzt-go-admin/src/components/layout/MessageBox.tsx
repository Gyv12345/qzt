import { BellOutlined, CheckOutlined, ReloadOutlined } from '@ant-design/icons'
import { Badge, Button, Empty, List, Popover, Space, Spin, Tabs, Tag, Tooltip, Typography } from 'antd'
import { useEffect, useState } from 'react'

type MessageCategory = 'system' | 'notice'

interface NoticeItem {
  category: MessageCategory
  title: string
  message?: string
  content?: string
  time?: string
  read: boolean
  /** 点击后跳转的路径(可选) */
  path?: string
}

const categoryMeta: Record<MessageCategory, { label: string; empty: string }> = {
  system: { label: '系统', empty: '暂无系统消息' },
  notice: { label: '通知', empty: '暂无通知公告' },
}

/**
 * 通知消息盒子。
 * TODO: 后端暂未提供消息接口,当前展示空态。接入时:
 *   1. 在 services/ 下新增消息 API 并替换 loadMessages 内的实现
 *   2. 按需补充已读/全部已读/跳转逻辑
 */
export default function MessageBox() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeKey, setActiveKey] = useState<MessageCategory>('system')
  const [items, setItems] = useState<NoticeItem[]>([])

  const loadMessages = async () => {
    setLoading(true)
    try {
      // TODO: 替换为真实接口,如 getMessageBox()
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) loadMessages()
  }, [open])

  const unreadCount = items.filter((i) => !i.read).length
  const currentItems = items.filter((i) => i.category === activeKey)

  const markAllRead = () => {
    setItems((prev) => prev.map((i) => ({ ...i, read: true })))
    // TODO: 调用批量已读接口
  }

  const content = (
    <div style={{ width: 340 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Typography.Text strong>消息盒子</Typography.Text>
        <Space size={4}>
          <Button type="link" size="small" icon={<ReloadOutlined />} onClick={loadMessages}>
            刷新
          </Button>
          <Button type="link" size="small" icon={<CheckOutlined />} onClick={markAllRead}>
            全部已读
          </Button>
        </Space>
      </div>
      <Tabs
        size="small"
        activeKey={activeKey}
        onChange={(k) => setActiveKey(k as MessageCategory)}
        items={(Object.keys(categoryMeta) as MessageCategory[]).map((key) => ({
          key,
          label: `${categoryMeta[key].label} ${items.filter((i) => i.category === key).length}`,
        }))}
      />
      <Spin spinning={loading}>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {currentItems.length ? (
            <List
              size="small"
              dataSource={currentItems}
              renderItem={(item) => (
                <List.Item style={{ cursor: 'pointer' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{item.title}</div>
                    {item.message && (
                      <div style={{ color: 'rgba(0,0,0,0.65)', fontSize: 12 }}>{item.message}</div>
                    )}
                    {item.time && <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>{item.time}</div>}
                  </div>
                  <Tag color={item.read ? 'default' : 'error'}>{item.read ? '已读' : '未读'}</Tag>
                </List.Item>
              )}
            />
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={categoryMeta[activeKey].empty} />
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
      <Tooltip title="消息盒子">
        <Badge count={unreadCount} size="small" offset={[-5, 5]}>
          <Button type="text" className="qzt-header-icon" icon={<BellOutlined />} aria-label="消息盒子" />
        </Badge>
      </Tooltip>
    </Popover>
  )
}
