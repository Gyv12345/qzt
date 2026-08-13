import { useCallback, useState } from 'react'
import { FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, Tag } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createTrip, listTrips } from '../../services/oa'
import type { OaBusinessTrip } from '../../types/oa'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import { APPROVAL_STATUS } from '../../types/oa'
import FormSheet from '../../components/FormSheet'

export default function TripList() {
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const fetcher = useCallback((params: { page: number; page_size: number }) => listTrips(params), [])
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

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title="新建出差申请"
        fields={[
          { name: 'title', label: '出差标题', type: 'text', required: true },
          { name: 'destination', label: '目的地', type: 'text', required: true },
          { name: 'start_date', label: '开始日期', type: 'date', datePrecision: 'date', required: true },
          { name: 'end_date', label: '结束日期', type: 'date', datePrecision: 'date', required: true },
          { name: 'transport', label: '交通方式', type: 'text' },
          { name: 'budget_amount', label: '预算金额', type: 'number' },
          { name: 'purpose', label: '出差事由', type: 'textarea' },
        ]}
        onClose={() => setShowNew(false)}
        onSubmit={async (v) => {
          await createTrip({
            title: v.title,
            destination: v.destination,
            start_date: v.start_date,
            end_date: v.end_date,
            transport: v.transport || undefined,
            budget_amount: v.budget_amount ? String(v.budget_amount) : undefined,
            purpose: v.purpose || undefined,
          })
          refresh()
        }}
      />
    </div>
  )
}
