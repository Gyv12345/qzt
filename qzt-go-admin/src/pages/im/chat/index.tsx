import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  App,
  Avatar,
  Badge,
  Button,
  Empty,
  Input,
  Modal,
  Popover,
  Space,
  Spin,
  Tooltip,
  theme as antdTheme,
} from 'antd'
import { PlusOutlined, SendOutlined, TeamOutlined, UserAddOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { useAuthStore } from '../../../stores/auth'
import UserSelect from '../../../components/UserSelect'
import { useSSE } from '../../../hooks/useSSE'
import {
  addConversationMembers,
  createGroupConversation,
  createSingleConversation,
  listConversations,
  listMessages,
  markConversationRead,
  sendMessage,
} from '../../../services/im'
import type { ImConversation, ImMessage, ImSSEPayload } from '../../../types/im'

/** 每页消息条数(与后端默认一致) */
const PAGE_SIZE = 20
/** SSE 地址与站内信共用同一条流,im_message 为其自定义事件 */
const SSE_URL = '/prod-api/oa/messages/stream'

/** 会话列表本地排序(last_message_at DESC,空值沉底);首屏以后端顺序为准,本地更新后兜底重排 */
function sortConvs(list: ImConversation[]): ImConversation[] {
  return [...list].sort((a, b) => {
    const ta = a.last_message_at ? dayjs(a.last_message_at).valueOf() : 0
    const tb = b.last_message_at ? dayjs(b.last_message_at).valueOf() : 0
    return tb - ta
  })
}

/** 列表里的最后一行预览:群聊带发送人前缀 */
function convPreview(c: ImConversation): string {
  const m = c.last_message
  if (!m) return '暂无消息'
  return c.type === 'group' && m.sender_name ? `${m.sender_name}: ${m.content}` : m.content
}

/** 列表时间:今天显示 HH:mm,更早显示 MM-DD */
function formatTime(t: string | null): string {
  if (!t) return ''
  const d = dayjs(t)
  return d.isSame(dayjs(), 'day') ? d.format('HH:mm') : d.format('MM-DD')
}

/**
 * IM 即时通讯页(im/chat/index):左栏会话列表 + 右栏聊天窗。
 * - 实时性:挂载一条 useSSE 连接,监听共用流上的 im_message 自定义事件
 *   (NotificationHandler 自持一条连站内信默认 message 事件,互不影响);
 * - 兜底:页面重新可见时刷新会话列表,并对当前会话重拉第一页按 id 合并去重;
 * - 历史:滚动到顶部以最早一条消息 id 为 before_id 追加更早一页,恢复滚动位置不跳变。
 */
export default function ImChatPage() {
  const { token } = antdTheme.useToken()
  const { message } = App.useApp()
  const myId = useAuthStore((s) => s.profile?.id)

  const [convs, setConvs] = useState<ImConversation[]>([])
  const [activeId, setActiveId] = useState<number | null>(null)
  const [messages, setMessages] = useState<ImMessage[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingConv, setLoadingConv] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  // 「发消息」Popover(单聊,选人即建会话)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [pickKey, setPickKey] = useState(0)
  const [creatingSingle, setCreatingSingle] = useState(false)
  // 「建群」Modal
  const [groupOpen, setGroupOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupIds, setGroupIds] = useState<number[]>([])
  const [creatingGroup, setCreatingGroup] = useState(false)
  // 群「加人」Modal
  const [addOpen, setAddOpen] = useState(false)
  const [addIds, setAddIds] = useState<number[]>([])
  const [addingMember, setAddingMember] = useState(false)
  // 列表项 hover 高亮(色值全部走 token,避免暗色模式失配)
  const [hoverId, setHoverId] = useState<number | null>(null)

  const listRef = useRef<HTMLDivElement>(null)
  const activeIdRef = useRef<number | null>(null)
  const convsRef = useRef<ImConversation[]>([])
  /** 下一次 messages 变更后的滚动意图:bottom=贴底,restore=翻页后保持视口 */
  const scrollModeRef = useRef<'bottom' | 'restore' | null>(null)
  const prevMetricsRef = useRef({ height: 0, top: 0 })

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])
  useEffect(() => {
    convsRef.current = convs
  }, [convs])

  const loadConvs = useCallback(async () => {
    try {
      const list = await listConversations()
      setConvs(sortConvs(list))
    } catch {
      // 拦截器已提示
    }
  }, [])

  useEffect(() => {
    void loadConvs()
  }, [loadConvs])

  const activeConv = useMemo(() => convs.find((c) => c.id === activeId) ?? null, [convs, activeId])

  /** messages 变化后按意图滚动(翻页恢复视口 / 新消息贴底) */
  useEffect(() => {
    const el = listRef.current
    if (!el || scrollModeRef.current === null) return
    if (scrollModeRef.current === 'restore') {
      const { height, top } = prevMetricsRef.current
      el.scrollTop = el.scrollHeight - height + top
    } else {
      el.scrollTop = el.scrollHeight
    }
    scrollModeRef.current = null
  }, [messages, loadingConv])

  /** 打开会话:拉第一页历史 + 清零未读 */
  const openConversation = useCallback(async (conv: ImConversation) => {
    if (conv.id === activeIdRef.current) return
    setActiveId(conv.id)
    setLoadingConv(true)
    setMessages([])
    setHasMore(false)
    scrollModeRef.current = 'bottom'
    try {
      const res = await listMessages(conv.id, undefined, PAGE_SIZE)
      if (conv.id !== activeIdRef.current) return
      setMessages([...res].reverse())
      setHasMore(res.length >= PAGE_SIZE)
      if (conv.unread > 0) {
        markConversationRead(conv.id).catch(() => {})
        setConvs((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread: 0 } : c)))
      }
    } catch {
      // 拦截器已提示
    } finally {
      setLoadingConv(false)
    }
  }, [])

  /** 滚动到顶部时按最早一条 id 追加更早一页,并保持视口不跳 */
  const handleScroll = () => {
    const el = listRef.current
    if (!el || loadingMore || loadingConv || !hasMore || activeId === null) return
    if (el.scrollTop > 4) return
    const oldest = messages[0]
    if (!oldest) return
    const convId = activeId
    prevMetricsRef.current = { height: el.scrollHeight, top: el.scrollTop }
    scrollModeRef.current = 'restore'
    setLoadingMore(true)
    listMessages(convId, oldest.id, PAGE_SIZE)
      .then((res) => {
        if (convId !== activeIdRef.current) return
        if (res.length === 0) {
          setHasMore(false)
          scrollModeRef.current = null
          return
        }
        setMessages((prev) => {
          const known = new Set(prev.map((m) => m.id))
          const older = [...res].reverse().filter((m) => !known.has(m.id))
          return [...older, ...prev]
        })
        setHasMore(res.length >= PAGE_SIZE)
      })
      .catch(() => {
        scrollModeRef.current = null
      })
      .finally(() => setLoadingMore(false))
  }

  /** 会话列表本地更新:有则更新置顶(非当前会话未读 +1),无则整表刷新(新会话/被拉群) */
  const bumpConversation = useCallback(
    (msg: ImMessage, isActive: boolean) => {
      const convId = msg.conversation_id
      if (!convsRef.current.some((c) => c.id === convId)) {
        void loadConvs()
        return
      }
      setConvs((prev) =>
        sortConvs(
          prev.map((c) =>
            c.id === convId
              ? {
                  ...c,
                  last_message: msg,
                  last_message_at: msg.created_at,
                  unread: isActive ? 0 : c.unread + 1,
                }
              : c,
          ),
        ),
      )
    },
    [loadConvs],
  )

  /** SSE im_message:当前会话追加消息并标记已读;列表始终更新 */
  const handleImEvent = useCallback(
    (_event: string, data: string) => {
      if (!data) return
      let payload: ImSSEPayload
      try {
        payload = JSON.parse(data) as ImSSEPayload
      } catch {
        return
      }
      const msg = payload?.message
      if (!msg || !msg.id) return
      const isActive = msg.conversation_id === activeIdRef.current
      if (isActive) {
        scrollModeRef.current = 'bottom'
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
        markConversationRead(msg.conversation_id).catch(() => {})
      }
      bumpConversation(msg, isActive)
    },
    [bumpConversation],
  )

  // 页面自持一条 SSE 连接;NotificationHandler 的全局连接不受影响
  useSSE(SSE_URL, { events: ['im_message'], onEvent: handleImEvent })

  /** 兜底:回到前台刷新会话列表;当前会话重拉第一页按 id 合并去重 */
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      void loadConvs()
      const convId = activeIdRef.current
      if (!convId) return
      listMessages(convId, undefined, PAGE_SIZE)
        .then((res) => {
          if (convId !== activeIdRef.current) return
          scrollModeRef.current = 'bottom'
          setMessages((prev) => {
            const map = new Map(prev.map((m) => [m.id, m]))
            for (const m of [...res].reverse()) map.set(m.id, m)
            return [...map.values()].sort((a, b) => a.id - b.id)
          })
          markConversationRead(convId).catch(() => {})
        })
        .catch(() => {})
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [loadConvs])

  /** 发送:POST 同步返回落库后的 ImMessage,直接追加 */
  const doSend = async () => {
    const text = input.trim()
    const convId = activeId
    if (!text || !convId || sending) return
    setSending(true)
    try {
      const msg = await sendMessage(convId, text)
      setInput('')
      scrollModeRef.current = 'bottom'
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      bumpConversation(msg, true)
      markConversationRead(convId).catch(() => {})
    } catch {
      // 拦截器已提示
    } finally {
      setSending(false)
    }
  }

  /** 单聊:选人即创建/获取会话并选中 */
  const handleSinglePick = async (userId: number) => {
    setCreatingSingle(true)
    try {
      const conv = await createSingleConversation(userId)
      setPopoverOpen(false)
      await loadConvs()
      void openConversation(conv)
    } catch {
      // 拦截器已提示
    } finally {
      setCreatingSingle(false)
    }
  }

  const handleCreateGroup = async () => {
    const name = groupName.trim()
    if (!name) {
      message.warning('请输入群名称')
      return
    }
    if (groupIds.length === 0) {
      message.warning('请至少选择一名成员')
      return
    }
    setCreatingGroup(true)
    try {
      const conv = await createGroupConversation(name, groupIds)
      setGroupOpen(false)
      setGroupName('')
      setGroupIds([])
      await loadConvs()
      void openConversation(conv)
      message.success('群聊已创建')
    } catch {
      // 拦截器已提示
    } finally {
      setCreatingGroup(false)
    }
  }

  const handleAddMembers = async () => {
    if (!activeConv) return
    if (addIds.length === 0) {
      message.warning('请选择要加入的成员')
      return
    }
    setAddingMember(true)
    try {
      const { added } = await addConversationMembers(activeConv.id, addIds)
      message.success(`已添加 ${added} 名成员`)
      setAddOpen(false)
      setAddIds([])
      setConvs((prev) =>
        prev.map((c) => (c.id === activeConv.id ? { ...c, member_count: c.member_count + added } : c)),
      )
    } catch {
      // 拦截器已提示
    } finally {
      setAddingMember(false)
    }
  }

  const renderConvAvatar = (c: ImConversation) => {
    const style = { backgroundColor: token.colorPrimaryBg, color: token.colorPrimary }
    if (c.type === 'group') return <Avatar style={style} icon={<TeamOutlined />} />
    const name = c.peer?.nickname || c.name || '?'
    return <Avatar style={style}>{name.slice(0, 1)}</Avatar>
  }

  const renderMessage = (m: ImMessage) => {
    const isMine = m.sender_id === myId
    const name = m.sender_name || `#${m.sender_id}`
    const avatarStyle = { backgroundColor: token.colorPrimaryBg, color: token.colorPrimary }
    return (
      <div
        key={m.id}
        style={{
          display: 'flex',
          justifyContent: isMine ? 'flex-end' : 'flex-start',
          gap: 8,
          marginBottom: 12,
        }}
      >
        {!isMine && (
          <Avatar size={28} style={{ ...avatarStyle, flexShrink: 0 }} src={m.sender_avatar || undefined}>
            {name.slice(0, 1)}
          </Avatar>
        )}
        <div
          style={{
            maxWidth: '72%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isMine ? 'flex-end' : 'flex-start',
          }}
        >
          {!isMine && (
            <div style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 2 }}>{name}</div>
          )}
          <div
            style={{
              padding: '8px 12px',
              borderRadius: token.borderRadius,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              background: isMine ? token.colorPrimary : token.colorBgContainer,
              color: isMine ? token.colorTextLightSolid : token.colorText,
              border: isMine ? 'none' : `1px solid ${token.colorBorderSecondary}`,
              boxShadow: token.boxShadowTertiary,
            }}
          >
            {m.content}
          </div>
        </div>
        {isMine && (
          <Avatar size={28} style={{ ...avatarStyle, flexShrink: 0 }} src={m.sender_avatar || undefined}>
            {name.slice(0, 1)}
          </Avatar>
        )}
      </div>
    )
  }

  const border = `1px solid ${token.colorBorderSecondary}`

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 140px)',
        background: token.colorBgContainer,
        border,
        borderRadius: token.borderRadiusLG,
        overflow: 'hidden',
      }}
    >
      {/* 左栏:会话列表 */}
      <div style={{ width: 320, flexShrink: 0, borderRight: border, display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            padding: '12px 16px',
            borderBottom: border,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontWeight: 600 }}>即时通讯</span>
          <Space size={4}>
            <Popover
              open={popoverOpen}
              onOpenChange={(open) => {
                setPopoverOpen(open)
                if (open) setPickKey((k) => k + 1)
              }}
              trigger="click"
              placement="bottomRight"
              content={
                <div style={{ width: 260 }}>
                  <UserSelect
                    key={pickKey}
                    style={{ width: '100%' }}
                    placeholder="选择用户开始单聊"
                    disabled={creatingSingle}
                    onChange={(v) => {
                      if (typeof v === 'number') void handleSinglePick(v)
                    }}
                  />
                </div>
              }
            >
              <Tooltip title="发消息">
                <Button size="small" icon={<PlusOutlined />}>
                  发消息
                </Button>
              </Tooltip>
            </Popover>
            <Tooltip title="建群">
              <Button size="small" icon={<TeamOutlined />} onClick={() => setGroupOpen(true)}>
                建群
              </Button>
            </Tooltip>
          </Space>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {convs.map((c) => (
            <div
              key={c.id}
              onClick={() => void openConversation(c)}
              onMouseEnter={() => setHoverId(c.id)}
              onMouseLeave={() => setHoverId((prev) => (prev === c.id ? null : prev))}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                cursor: 'pointer',
                background:
                  c.id === activeId
                    ? token.colorPrimaryBg
                    : hoverId === c.id
                      ? token.colorFillTertiary
                      : 'transparent',
              }}
            >
              {renderConvAvatar(c)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: c.unread > 0 ? 600 : 400,
                    }}
                  >
                    {c.name}
                  </span>
                  <span style={{ fontSize: 12, color: token.colorTextTertiary, marginLeft: 8, flexShrink: 0 }}>
                    {formatTime(c.last_message_at)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', marginTop: 2 }}>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontSize: 12,
                      color: token.colorTextSecondary,
                    }}
                  >
                    {convPreview(c)}
                  </span>
                  {c.unread > 0 && <Badge count={c.unread} size="small" style={{ marginLeft: 8, flexShrink: 0 }} />}
                </div>
              </div>
            </div>
          ))}
          {convs.length === 0 && !loadingConv && (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无会话" style={{ marginTop: 80 }} />
          )}
        </div>
      </div>

      {/* 右栏:聊天窗 */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {!activeConv ? (
          <Empty description="选择一个会话开始聊天" style={{ marginTop: 140 }} />
        ) : (
          <>
            <div
              style={{
                padding: '12px 16px',
                borderBottom: border,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>{activeConv.name}</span>
                {activeConv.type === 'group' && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: token.colorTextTertiary }}>
                    {activeConv.member_count} 人
                  </span>
                )}
              </div>
              {activeConv.type === 'group' && (
                <Button
                  size="small"
                  icon={<UserAddOutlined />}
                  onClick={() => {
                    setAddIds([])
                    setAddOpen(true)
                  }}
                >
                  加人
                </Button>
              )}
            </div>
            <div ref={listRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
              {loadingConv ? (
                <div style={{ textAlign: 'center', marginTop: 100 }}>
                  <Spin />
                </div>
              ) : (
                <>
                  <div style={{ height: 22, textAlign: 'center', fontSize: 12, color: token.colorTextTertiary }}>
                    {loadingMore ? <Spin size="small" /> : hasMore ? '上滑加载更早的消息' : ''}
                  </div>
                  {messages.map(renderMessage)}
                  {messages.length === 0 && (
                    <Empty description="暂无消息,来发送第一条吧" style={{ marginTop: 100 }} />
                  )}
                </>
              )}
            </div>
            <div style={{ borderTop: border, padding: 12 }}>
              <Space.Compact style={{ width: '100%' }}>
                <Input.TextArea
                  placeholder="输入消息,Enter 发送,Shift+Enter 换行"
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault()
                      void doSend()
                    }
                  }}
                  disabled={sending}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={sending}
                  onClick={() => void doSend()}
                  disabled={!input.trim()}
                >
                  发送
                </Button>
              </Space.Compact>
            </div>
          </>
        )}
      </div>

      {/* 建群 Modal */}
      <Modal
        title="创建群聊"
        open={groupOpen}
        confirmLoading={creatingGroup}
        okText="创建"
        onOk={() => void handleCreateGroup()}
        onCancel={() => {
          setGroupOpen(false)
          setGroupName('')
          setGroupIds([])
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Input
            placeholder="群名称"
            value={groupName}
            maxLength={50}
            onChange={(e) => setGroupName(e.target.value)}
          />
          <UserSelect
            style={{ width: '100%' }}
            mode="multiple"
            placeholder="选择群成员(可多选)"
            value={groupIds}
            onChange={(v) => setGroupIds(Array.isArray(v) ? v : [])}
          />
        </Space>
      </Modal>

      {/* 群加人 Modal */}
      <Modal
        title={`向「${activeConv?.name ?? ''}」添加成员`}
        open={addOpen}
        confirmLoading={addingMember}
        okText="添加"
        onOk={() => void handleAddMembers()}
        onCancel={() => {
          setAddOpen(false)
          setAddIds([])
        }}
      >
        <UserSelect
          style={{ width: '100%' }}
          mode="multiple"
          placeholder="选择要加入的成员(可多选)"
          value={addIds}
          onChange={(v) => setAddIds(Array.isArray(v) ? v : [])}
        />
      </Modal>
    </div>
  )
}
