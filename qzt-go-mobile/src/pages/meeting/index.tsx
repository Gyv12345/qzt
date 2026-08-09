import { useCallback, useState, useEffect } from 'react'
import { InfiniteScroll, NavBar, PullToRefresh, Tag, FloatingBubble, Card, Button, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { listMeetingBookings, listMeetingRooms, createMeetingBooking, submitMeetingBookingApproval } from '../../services/oa'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import FormSheet from '../../components/FormSheet'

const APPROVAL_STATUS: Record<string, { text: string; color: string }> = {
  NONE: { text: '未提交', color: 'default' },
  APPROVING: { text: '审批中', color: 'primary' },
  APPROVED: { text: '已通过', color: 'success' },
  REJECTED: { text: '已驳回', color: 'danger' },
  REVOKED: { text: '已撤回', color: 'warning' },
}

export default function MeetingBookingList() {
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const [rooms, setRooms] = useState<any[]>([])
  const fetcher = useCallback((params: { page: number; page_size: number }) => listMeetingBookings(params), [])
  const { list, hasMore, loadMore, refresh } = useInfiniteList<any>(fetcher, { page_size: 20 })

  useEffect(() => {
    listMeetingRooms().then((res) => setRooms((res.list || []).filter((r: any) => r.status === 'ENABLED')))
  }, [])

  const handleSubmit = async (id: number) => {
    await submitMeetingBookingApproval(id)
    Toast.show({ icon: 'success', content: '已提交审批' })
    refresh()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>会议预订</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <div style={{ padding: 8 }}>
          {list.map((b) => {
            const s = APPROVAL_STATUS[b.approval_status] || APPROVAL_STATUS.NONE
            return (
              <Card key={b.id} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>{b.title}</span>
                  <Tag color={s.color} fill="outline">{s.text}</Tag>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  {b.start_time?.slice(5, 16)} ~ {b.end_time?.slice(5, 16)}
                </div>
                {b.attendees > 0 && <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>参会: {b.attendees}人</div>}
                {b.approval_status === 'NONE' && (
                  <Button size="mini" color="primary" fill="outline" style={{ marginTop: 8 }} onClick={() => handleSubmit(b.id)}>
                    提交审批
                  </Button>
                )}
              </Card>
            )
          })}
          {list.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 40 }}>暂无预订</div>}
        </div>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title="预订会议"
        onClose={() => setShowNew(false)}
        fields={[
          { name: 'title', label: '会议标题', type: 'text', required: true },
          { name: 'room_id', label: '会议室', type: 'select', required: true, options: rooms.map((r) => ({ label: r.name, value: r.id })) },
          { name: 'start_time', label: '开始(YYYY-MM-DD HH:mm:ss)', type: 'text', required: true, placeholder: '2026-08-09 14:00:00' },
          { name: 'end_time', label: '结束(YYYY-MM-DD HH:mm:ss)', type: 'text', required: true, placeholder: '2026-08-09 15:00:00' },
          { name: 'attendees', label: '参会人数', type: 'number' },
          { name: 'topic', label: '会议主题', type: 'textarea' },
        ]}
        onSubmit={async (vals) => {
          await createMeetingBooking({
            title: vals.title,
            room_id: Number(vals.room_id),
            start_time: vals.start_time,
            end_time: vals.end_time,
            attendees: vals.attendees ? Number(vals.attendees) : 0,
            topic: vals.topic,
          })
          refresh()
        }}
      />
    </div>
  )
}
