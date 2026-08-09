import { useCallback, useState } from 'react'
import { InfiniteScroll, NavBar, PullToRefresh, Tag, FloatingBubble, Card } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { listSchedules, createSchedule } from '../../services/oa'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import FormSheet from '../../components/FormSheet'

const TYPE_MAP: Record<string, { text: string; color: string }> = {
  MEETING: { text: '会议', color: 'primary' },
  TASK: { text: '任务', color: 'warning' },
  REMINDER: { text: '提醒', color: 'default' },
  OUT: { text: '外出', color: 'success' },
  OTHER: { text: '其他', color: 'default' },
}
const STATUS_MAP: Record<string, string> = { PENDING: '待处理', DONE: '已完成', CANCELED: '已取消' }

export default function ScheduleList() {
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const fetcher = useCallback((params: { page: number; page_size: number }) => listSchedules(params), [])
  const { list, hasMore, loadMore, refresh } = useInfiniteList<any>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>日程安排</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <div style={{ padding: 8 }}>
          {list.map((s) => {
            const t = TYPE_MAP[s.event_type] || TYPE_MAP.OTHER
            return (
              <Card key={s.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{s.title}</span>
                  <Tag color={t.color} fill="outline">{t.text}</Tag>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {s.start_time?.slice(5, 16)} ~ {s.end_time?.slice(5, 16)}
                </div>
                {s.location && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>📍 {s.location}</div>}
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  状态: {STATUS_MAP[s.status] || s.status}
                </div>
              </Card>
            )
          })}
          {list.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>暂无日程</div>}
        </div>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title="新建日程"
        onClose={() => setShowNew(false)}
        fields={[
          { name: 'title', label: '标题', type: 'text', required: true },
          { name: 'event_type', label: '类型', type: 'select', options: [
            { label: '会议', value: 'MEETING' }, { label: '任务', value: 'TASK' },
            { label: '提醒', value: 'REMINDER' }, { label: '外出', value: 'OUT' }, { label: '其他', value: 'OTHER' },
          ] },
          { name: 'start_time', label: '开始(YYYY-MM-DD HH:mm:ss)', type: 'text', required: true, placeholder: '2026-08-09 14:00:00' },
          { name: 'end_time', label: '结束(YYYY-MM-DD HH:mm:ss)', type: 'text', required: true, placeholder: '2026-08-09 15:00:00' },
          { name: 'location', label: '地点', type: 'text' },
          { name: 'content', label: '内容', type: 'textarea' },
        ]}
        onSubmit={async (vals) => {
          await createSchedule(vals as any)
          refresh()
        }}
      />
    </div>
  )
}
