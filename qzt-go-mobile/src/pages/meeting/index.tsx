import { useCallback, useState, useEffect } from 'react'
import { InfiniteScroll, NavBar, PullToRefresh, Tag, FloatingBubble, Card, Button, Dialog, Toast } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createMeetingBooking, deleteMeetingBooking, listMeetingBookings, listMeetingRooms, submitMeetingBookingApproval, updateMeetingBooking } from '../../services/oa'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import FormSheet, { type FormField } from '../../components/FormSheet'

const APPROVAL_STATUS: Record<string, { text: string; color: string }> = {
  NONE: { text: '未提交', color: 'default' },
  APPROVING: { text: '审批中', color: 'primary' },
  APPROVED: { text: '已通过', color: 'success' },
  REJECTED: { text: '已驳回', color: 'danger' },
  REVOKED: { text: '已撤回', color: 'warning' },
}

const FORM_FIELDS: FormField[] = [
  { name: 'title', label: '会议标题', type: 'text', required: true },
  { name: 'room_id', label: '会议室', type: 'select', required: true },
  { name: 'start_time', label: '开始时间', type: 'date', datePrecision: 'datetime', required: true },
  { name: 'end_time', label: '结束时间', type: 'date', datePrecision: 'datetime', required: true },
  { name: 'attendees', label: '参会人数', type: 'number' },
  { name: 'topic', label: '会议主题', type: 'textarea' },
]

export default function MeetingBookingList() {
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [rooms, setRooms] = useState<any[]>([])
  const fetcher = useCallback((params: { page: number; page_size: number }) => listMeetingBookings(params), [])
  const { list, hasMore, loadMore, refresh } = useInfiniteList<any>(fetcher, { page_size: 20 })

  useEffect(() => {
    listMeetingRooms().then((res) => setRooms((res.list || []).filter((r: any) => r.status === 'ENABLED')))
  }, [])

  const fields: FormField[] = [
    FORM_FIELDS[0],
    { ...FORM_FIELDS[1], options: rooms.map((r) => ({ label: r.name, value: r.id })) },
    ...FORM_FIELDS.slice(2),
  ]

  const handleSubmit = async (id: number) => {
    await submitMeetingBookingApproval(id)
    Toast.show({ icon: 'success', content: '已提交审批' })
    refresh()
  }

  const onDelete = async (b: any) => {
    const ok = await Dialog.confirm({ content: `确定删除预订「${b.title}」?` })
    if (!ok) return
    try {
      await deleteMeetingBooking(b.id)
      Toast.show({ icon: 'success', content: '已删除' })
      refresh()
    } catch {
    }
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
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <Button size="mini" color="primary" fill="outline" onClick={() => handleSubmit(b.id)}>提交审批</Button>
                    <Button size="mini" color="primary" fill="none" onClick={() => setEditing(b)}>编辑</Button>
                    <Button size="mini" color="danger" fill="none" onClick={() => onDelete(b)}>删除</Button>
                  </div>
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
        visible={showNew || !!editing}
        title={editing ? '编辑预订' : '预订会议'}
        fields={fields}
        initialValues={
          editing
            ? { title: editing.title, room_id: editing.room_id, start_time: editing.start_time, end_time: editing.end_time, attendees: editing.attendees, topic: editing.topic }
            : undefined
        }
        onClose={() => {
          setShowNew(false)
          setEditing(null)
        }}
        onSubmit={async (vals) => {
          const payload = {
            title: vals.title,
            room_id: Number(vals.room_id),
            start_time: vals.start_time,
            end_time: vals.end_time,
            attendees: vals.attendees ? Number(vals.attendees) : 0,
            topic: vals.topic,
          }
          if (editing) await updateMeetingBooking(editing.id, payload)
          else await createMeetingBooking(payload)
          setEditing(null)
          refresh()
        }}
      />
    </div>
  )
}
