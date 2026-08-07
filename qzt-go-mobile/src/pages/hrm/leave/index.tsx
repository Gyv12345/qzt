import { useCallback } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listLeaves } from '../../../services/hrm'
import type { HrmLeave } from '../../../types/hrm'
import { LEAVE_TYPE, LEAVE_APPROVAL_STATUS } from '../../../types/hrm'
import { useInfiniteList } from '../../../hooks/useInfiniteList'

export default function LeaveList() {
  const navigate = useNavigate()
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listLeaves(params),
    [],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<HrmLeave>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>请假管理</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((l) => {
            const s = LEAVE_APPROVAL_STATUS[l.approval_status] || LEAVE_APPROVAL_STATUS.NONE
            return (
              <List.Item
                key={l.id}
                onClick={() => navigate(`/hrm/leave/${l.id}`)}
                description={
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {l.leave_no} · {LEAVE_TYPE[l.leave_type] || l.leave_type} · {l.duration_days}天
                  </span>
                }
                extra={<Tag color={s.color} fill="outline">{s.text}</Tag>}
              >
                {l.start_date?.slice(0, 10)} ~ {l.end_date?.slice(0, 10)}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无请假</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
