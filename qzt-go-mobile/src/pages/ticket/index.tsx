import { useCallback } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listTickets } from '../../services/crm'
import type { CrmTicket } from '../../types/crm'
import { TICKET_STATUS } from '../../types/crm'
import { useInfiniteList } from '../../hooks/useInfiniteList'

const PRIORITY_TEXT: Record<number, string> = { 1: '低', 2: '中', 3: '高', 4: '紧急' }

export default function TicketList() {
  const navigate = useNavigate()
  const fetcher = useCallback((params: { page: number; page_size: number }) => listTickets(params), [])
  const { list, hasMore, loadMore, refresh } = useInfiniteList<CrmTicket>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>售后工单</NavBar>
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
    </div>
  )
}
