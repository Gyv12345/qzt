import { useCallback, useEffect, useState, useRef } from 'react'
import { Badge, InfiniteScroll, List, NavBar, PullToRefresh, Tabs, Toast } from 'antd-mobile'
import { listInbox, listNotices, markRead, markAllRead, getUnreadCount } from '../../services/enterprise'
import type { EntMessage, EntNotice } from '../../types/enterprise'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import { useSSE } from '../../hooks/useSSE'
import dayjs from 'dayjs'

type TabKey = 'messages' | 'notices'

export default function Messages() {
  const [tab, setTab] = useState<TabKey>('messages')
  const [unread, setUnread] = useState(0)
  const lastMsgId = useRef<string | null>(null)

  // SSE 实时通知
  const { lastMessage } = useSSE('/prod-api/oa/messages/stream')

  const loadUnread = () => {
    getUnreadCount()
      .then((res) => setUnread(res.unread_count || 0))
      .catch(() => {})
  }
  useEffect(loadUnread, [])

  // 消息列表
  const msgFetcher = useCallback(
    (params: { page: number; page_size: number }) => listInbox(params),
    [],
  )
  const {
    list: messages,
    hasMore: msgHasMore,
    loadMore: msgLoadMore,
    refresh: msgRefresh,
  } = useInfiniteList<EntMessage>(msgFetcher, { page_size: 20 })

  // 公告列表
  const noticeFetcher = useCallback(
    (params: { page: number; page_size: number }) => listNotices(params),
    [],
  )
  const {
    list: notices,
    hasMore: noticeHasMore,
    loadMore: noticeLoadMore,
    refresh: noticeRefresh,
  } = useInfiniteList<EntNotice>(noticeFetcher, { page_size: 20 })

  // SSE 收到新消息 → 刷新列表 + 未读数 + Toast 通知
  useEffect(() => {
    if (!lastMessage) return
    const msgKey = `${lastMessage.title}-${lastMessage.body}`
    if (lastMsgId.current === msgKey) return // 去重
    lastMsgId.current = msgKey

    // 刷新数据
    msgRefresh()
    loadUnread()

    // Toast 提示(顶部弹出)
    Toast.show({
      icon: 'mail',
      content: `${lastMessage.title}: ${lastMessage.body?.slice(0, 30)}`,
      duration: 3000,
    })
  }, [lastMessage, msgRefresh])

  const onOpenMessage = async (msg: EntMessage) => {
    if (msg.is_read === 0) {
      try {
        await markRead(msg.id)
        msgRefresh()
        loadUnread()
      } catch {
        // 忽略
      }
    }
  }

  const onMarkAll = async () => {
    try {
      await markAllRead()
      Toast.show({ icon: 'success', content: '已全部标记为已读' })
      msgRefresh()
      loadUnread()
    } catch {
      // 忽略
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar
        back={null}
        right={
          unread > 0 && tab === 'messages' ? (
            <span style={{ fontSize: 13, color: 'var(--brand)' }} onClick={onMarkAll}>
              全部已读
            </span>
          ) : undefined
        }
      >
        消息
      </NavBar>

      <Tabs activeKey={tab} onChange={(k) => setTab(k as TabKey)}>
        <Tabs.Tab
          title={unread > 0 ? <Badge content={unread > 99 ? '99+' : unread}>消息</Badge> : '消息'}
          key="messages"
        />
        <Tabs.Tab title="公告" key="notices" />
      </Tabs>

      {tab === 'messages' ? (
        <PullToRefresh onRefresh={msgRefresh}>
          <List style={{ marginTop: 1 }}>
            {messages.map((m) => (
              <List.Item
                key={m.id}
                onClick={() => onOpenMessage(m)}
                description={
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {dayjs(m.created_at).format('MM-DD HH:mm')}
                  </span>
                }
                extra={
                  m.is_read === 0 ? (
                    <Badge wrapperStyle={{ padding: '0 6px' }} content={Badge.dot} />
                  ) : null
                }
              >
                <div style={{ fontWeight: m.is_read === 0 ? 600 : 400 }}>{m.title}</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{m.content}</div>
              </List.Item>
            ))}
            {messages.length === 0 && (
              <List.Item>
                <span style={{ color: 'var(--text-tertiary)' }}>暂无消息</span>
              </List.Item>
            )}
          </List>
          <InfiniteScroll loadMore={msgLoadMore} hasMore={msgHasMore} />
        </PullToRefresh>
      ) : (
        <PullToRefresh onRefresh={noticeRefresh}>
          <List style={{ marginTop: 1 }}>
            {notices.map((n) => (
              <List.Item
                key={n.id}
                description={
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {n.publish_time ? dayjs(n.publish_time).format('YYYY-MM-DD HH:mm') : ''}
                  </span>
                }
              >
                <div style={{ fontWeight: 500 }}>{n.title}</div>
                <div
                  style={{
                    fontSize: 13,
                    color: '#666',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {n.content}
                </div>
              </List.Item>
            ))}
            {notices.length === 0 && (
              <List.Item>
                <span style={{ color: 'var(--text-tertiary)' }}>暂无公告</span>
              </List.Item>
            )}
          </List>
          <InfiniteScroll loadMore={noticeLoadMore} hasMore={noticeHasMore} />
        </PullToRefresh>
      )}
    </div>
  )
}
