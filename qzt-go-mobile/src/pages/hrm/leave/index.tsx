import { useCallback, useState } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, Tag, FloatingBubble } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { listLeaves, applyLeave } from '../../../services/hrm'
import type { HrmLeave } from '../../../types/hrm'
import { LEAVE_TYPE, LEAVE_APPROVAL_STATUS } from '../../../types/hrm'
import { useInfiniteList } from '../../../hooks/useInfiniteList'
import FormSheet from '../../../components/FormSheet'

export default function LeaveList() {
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
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

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title="申请请假"
        onClose={() => setShowNew(false)}
        fields={[
          { name: 'leave_type', label: '请假类型', type: 'select', required: true, options: [
            { label: '事假', value: 'PERSONAL' }, { label: '病假', value: 'SICK' },
            { label: '年假', value: 'ANNUAL' }, { label: '婚假', value: 'MARRIAGE' },
            { label: '产假', value: 'MATERNITY' }, { label: '其他', value: 'OTHER' },
          ] },
          { name: 'start_date', label: '开始日期(YYYY-MM-DD)', type: 'text', required: true, placeholder: '2026-08-09' },
          { name: 'end_date', label: '结束日期(YYYY-MM-DD)', type: 'text', required: true, placeholder: '2026-08-10' },
          { name: 'duration_days', label: '请假天数', type: 'number', required: true },
          { name: 'reason', label: '事由', type: 'textarea' },
        ]}
        onSubmit={async (vals) => {
          // employee_id 传 0,后端从当前登录用户推导员工档案
          await applyLeave({
            employee_id: 0,
            leave_type: vals.leave_type,
            start_date: vals.start_date + ' 00:00:00',
            end_date: vals.end_date + ' 23:59:59',
            duration_days: String(vals.duration_days),
            reason: vals.reason,
          })
          refresh()
        }}
      />
    </div>
  )
}
