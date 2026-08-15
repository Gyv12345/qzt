import { useCallback, useState } from 'react'
import { FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createTicket, listTickets } from '../../services/crm'
import type { CrmTicket } from '../../types/crm'
import { TICKET_STATUS } from '../../types/crm'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import FormSheet from '../../components/FormSheet'

const PRIORITY_TEXT: Record<number, string> = { 1: '低', 2: '中', 3: '高', 4: '紧急' }
const PRIORITY_OPTIONS = [
  { label: '低', value: 1 },
  { label: '普通', value: 2 },
  { label: '高', value: 3 },
  { label: '紧急', value: 4 },
]

export default function TicketList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  // 已提交的搜索词:仅在点击搜索/清空时更新,作为 hook 的 dep(避免每击键都发请求)
  const [query, setQuery] = useState('')
  const [showNew, setShowNew] = useState(false)
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listTickets({ ...params, keyword: query || undefined }),
    [query],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<CrmTicket>(fetcher, { page_size: 20 }, [query])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>售后工单</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar
          placeholder="搜索工单标题"
          value={keyword}
          onChange={setKeyword}
          onSearch={(v) => setQuery(v)}
          onClear={() => {
            setKeyword('')
            setQuery('')
          }}
        />
      </div>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((t) => {
            const s = TICKET_STATUS[t.status] || TICKET_STATUS[1]
            return (
              <List.Item
                key={t.id}
                onClick={() => navigate(`/ticket/${t.id}`)}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t.ticket_no} · {t.customer_name || '-'} · {t.category || '-'}</span>}
                extra={<Tag color={s.color} fill="outline">{s.text}</Tag>}
              >
                {t.title} {t.priority >= 3 && <Tag color="danger" style={{ marginLeft: 4 }}>{PRIORITY_TEXT[t.priority]}</Tag>}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无工单</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title="新建工单"
        fields={[
          { name: 'title', label: '工单标题', type: 'text', required: true },
          { name: 'customer_name', label: '客户名称', type: 'text' },
          { name: 'contact_name', label: '联系人', type: 'text' },
          { name: 'contact_phone', label: '联系电话', type: 'text' },
          { name: 'category', label: '类型', type: 'text' },
          { name: 'priority', label: '优先级', type: 'select', options: PRIORITY_OPTIONS },
          { name: 'description', label: '问题描述', type: 'textarea' },
        ]}
        onClose={() => setShowNew(false)}
        onSubmit={async (v) => {
          await createTicket({
            title: v.title,
            customer_name: v.customer_name || undefined,
            contact_name: v.contact_name || undefined,
            contact_phone: v.contact_phone || undefined,
            category: v.category || undefined,
            priority: v.priority ? Number(v.priority) : undefined,
            description: v.description || undefined,
          })
          refresh()
        }}
      />
    </div>
  )
}
