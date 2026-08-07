import { useCallback } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listReceivables } from '../../../services/finance'
import type { FinReceivable } from '../../../types/finance'
import { SETTLE_STATUS, DIRECTION_TEXT } from '../../../types/finance'
import { useInfiniteList } from '../../../hooks/useInfiniteList'

export default function ReceivableList() {
  const navigate = useNavigate()
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listReceivables(params),
    [],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<FinReceivable>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>应收应付</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((r) => {
            const d = DIRECTION_TEXT[r.direction] || { text: r.direction, color: 'default' }
            const s = SETTLE_STATUS[r.status] || SETTLE_STATUS[0]
            const remaining = Number(r.original_amount) - Number(r.settled_amount)
            return (
              <List.Item
                key={r.id}
                onClick={() => navigate(`/finance/receivable/${r.id}`)}
                description={
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {r.doc_no} · {r.party_name}
                  </span>
                }
                extra={
                  <span>
                    <div style={{ textAlign: 'right', fontWeight: 600, color: remaining > 0 ? '#ff4d4f' : 'inherit' }}>
                      ¥{remaining.toFixed(2)}
                    </div>
                    <Tag color={d.color} fill="outline" style={{ marginTop: 2 }}>{d.text}</Tag>
                    <Tag color={s.color} fill="outline" style={{ marginLeft: 4 }}>{s.text}</Tag>
                  </span>
                }
              >
                {r.party_name}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无往来款</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
