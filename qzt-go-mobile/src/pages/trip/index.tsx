import { useCallback } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listTrips } from '../../services/oa'
import type { OaBusinessTrip } from '../../types/oa'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import { APPROVAL_STATUS } from '../../types/oa'

export default function TripList() {
  const navigate = useNavigate()
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listTrips(params),
    [],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<OaBusinessTrip>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>出差管理</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((t) => {
            const s = APPROVAL_STATUS[t.approval_status] || APPROVAL_STATUS.NONE
            return (
              <List.Item
                key={t.id}
                onClick={() => navigate(`/trip/${t.id}`)}
                description={
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {t.trip_no} · {t.destination} · {t.start_date?.slice(0, 10)}~{t.end_date?.slice(0, 10)}
                  </span>
                }
                extra={<Tag color={s.color} fill="outline">{s.text}</Tag>}
              >
                {t.title}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无出差</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
