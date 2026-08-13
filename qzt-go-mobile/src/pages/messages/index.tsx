import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge, Button, InfiniteScroll, Input, List, NavBar, Popup, PullToRefresh, Tabs, TextArea, Toast } from 'antd-mobile'
import { deleteMessage, getUnreadCount, listInbox, listNotices, listOutbox, markAllRead, markRead, sendMessage } from '../../services/enterprise'
import type { EntMessage, EntNotice } from '../../types/enterprise'
import type { SysUserOption } from '../../services/user'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import { useSSE } from '../../hooks/useSSE'
import UserPicker from '../../components/UserPicker'
import dayjs from 'dayjs'

type TabKey = 'messages' | 'sent' | 'notices'

export default function Messages() {
  const [tab, setTab] = useState<TabKey>('messages')
  const [unread, setUnread] = useState(0)
  const lastMsgId = useRef<string | null>(null)

  const { lastMessage } = useSSE('/prod-api/oa/messages/stream')

  // 写信
  const [showCompose, setShowCompose] = useState(false)
  const [showPicker, setShowPicker] = useState(false)
  const [receiver, setReceiver] = useState<SysUserOption | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)

  const loadUnread = () => {
    getUnreadCount()
      .then((res) => setUnread(res.unread_count || 0))
      .catch(() => {})
  }
  useEffect(loadUnread, [])

  const msgFetcher = useCallback((params: { page: number; page_size: number }) => listInbox(params), [])
  const { list: messages, hasMore: msgHasMore, loadMore: msgLoadMore, refresh: msgRefresh } = useInfiniteList<EntMessage>(msgFetcher, { page_size: 20 })

  const sentFetcher = useCallback((params: { page: number; page_size: number }) => listOutbox(params), [])
  const { list: sent, hasMore: sentHasMore, loadMore: sentLoadMore, refresh: sentRefresh } = useInfiniteList<EntMessage>(sentFetcher, { page_size: 20 })

  const noticeFetcher = useCallback((params: { page: number; page_size: number }) => listNotices(params), [])
  const { list: notices, hasMore: noticeHasMore, loadMore: noticeLoadMore, refresh: noticeRefresh } = useInfiniteList<EntNotice>(noticeFetcher, { page_size: 20 })

  // SSE 收到新消息 → 刷新 + Toast
  useEffect(() => {
    if (!lastMessage) return
    const msgKey = `${lastMessage.title}-${lastMessage.body}`
    if (lastMsgId.current === msgKey) return
    lastMsgId.current = msgKey
    msgRefresh()
    loadUnread()
    Toast.show({ icon: 'mail', content: `${lastMessage.title}: ${lastMessage.body?.slice(0, 30)}`, duration: 3000 })
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
    }
  }
  const onDeleteMessage = async (msg: EntMessage, refreshFn: () => void) => {
    try {
      await deleteMessage(msg.id)
      Toast.show({ icon: 'success', content: '已删除' })
      refreshFn()
    } catch {
    }
  }

  const onSend = async () => {
    if (!receiver) {
      Toast.show('请选择收件人')
      return
    }
    if (!title.trim()) {
      Toast.show('请输入标题')
      return
    }
    if (!content.trim()) {
      Toast.show('请输入内容')
      return
    }
    setSending(true)
    try {
      await sendMessage({ receiver_id: receiver.id, title, content })
      Toast.show({ icon: 'success', content: '已发送' })
      setShowCompose(false)
      setReceiver(null)
      setTitle('')
      setContent('')
      sentRefresh()
    } catch {
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar
        back={null}
        right={
          <span style={{ fontSize: 13, color: 'var(--brand)', display: 'flex', gap: 12 }}>
            <span onClick={() => setShowCompose(true)}>写信</span>
            {unread > 0 && tab === 'messages' && <span onClick={onMarkAll}>全部已读</span>}
          </span>
        }
      >
        消息
      </NavBar>

      <Tabs activeKey={tab} onChange={(k) => setTab(k as TabKey)}>
        <Tabs.Tab
          title={unread > 0 ? <Badge content={unread > 99 ? '99+' : unread}>消息</Badge> : '消息'}
          key="messages"
        />
        <Tabs.Tab title="发件箱" key="sent" />
        <Tabs.Tab title="公告" key="notices" />
      </Tabs>

      {tab === 'messages' ? (
        <PullToRefresh onRefresh={msgRefresh}>
          <List style={{ marginTop: 1 }}>
            {messages.map((m) => (
              <List.Item
                key={m.id}
                onClick={() => onOpenMessage(m)}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{dayjs(m.created_at).format('MM-DD HH:mm')}</span>}
                extra={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {m.is_read === 0 ? <Badge wrapperStyle={{ padding: '0 6px' }} content={Badge.dot} /> : null}
                    <a style={{ color: '#ff4d4f', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onDeleteMessage(m, msgRefresh) }}>删除</a>
                  </span>
                }
              >
                <div style={{ fontWeight: m.is_read === 0 ? 600 : 400 }}>{m.title}</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{m.content}</div>
              </List.Item>
            ))}
            {messages.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无消息</span></List.Item>}
          </List>
          <InfiniteScroll loadMore={msgLoadMore} hasMore={msgHasMore} />
        </PullToRefresh>
      ) : tab === 'sent' ? (
        <PullToRefresh onRefresh={sentRefresh}>
          <List style={{ marginTop: 1 }}>
            {sent.map((m) => (
              <List.Item
                key={m.id}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{dayjs(m.created_at).format('MM-DD HH:mm')}</span>}
                extra={<a style={{ color: '#ff4d4f', fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onDeleteMessage(m, sentRefresh) }}>删除</a>}
              >
                <div style={{ fontWeight: 500 }}>{m.title}</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{m.content}</div>
              </List.Item>
            ))}
            {sent.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无发件</span></List.Item>}
          </List>
          <InfiniteScroll loadMore={sentLoadMore} hasMore={sentHasMore} />
        </PullToRefresh>
      ) : (
        <PullToRefresh onRefresh={noticeRefresh}>
          <List style={{ marginTop: 1 }}>
            {notices.map((n) => (
              <List.Item
                key={n.id}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{n.publish_time ? dayjs(n.publish_time).format('YYYY-MM-DD HH:mm') : ''}</span>}
              >
                <div style={{ fontWeight: 500 }}>{n.title}</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.content}</div>
              </List.Item>
            ))}
            {notices.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无公告</span></List.Item>}
          </List>
          <InfiniteScroll loadMore={noticeLoadMore} hasMore={noticeHasMore} />
        </PullToRefresh>
      )}

      {/* 写信 */}
      <Popup
        visible={showCompose}
        onMaskClick={() => setShowCompose(false)}
        position="bottom"
        destroyOnClose
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16, maxHeight: '85vh', overflowY: 'auto' }}
      >
        <div style={{ fontSize: 17, fontWeight: 600, textAlign: 'center', marginBottom: 16 }}>写站内信</div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>收件人</div>
          <div
            onClick={() => setShowPicker(true)}
            style={{ padding: '8px 0', fontSize: 15, color: receiver ? 'var(--text-primary)' : 'var(--text-tertiary)', borderBottom: '1px solid var(--divider)' }}
          >
            {receiver ? receiver.nickname || receiver.username : '请选择收件人'}
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>标题</div>
          <Input placeholder="消息标题" value={title} onChange={setTitle} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginBottom: 6 }}>内容</div>
          <TextArea placeholder="消息内容" rows={4} value={content} onChange={setContent} />
        </div>
        <Button block color="primary" size="large" loading={sending} onClick={onSend}>发送</Button>

        <UserPicker visible={showPicker} title="选择收件人" onClose={() => setShowPicker(false)} onPick={(u) => setReceiver(u)} />
      </Popup>
    </div>
  )
}
