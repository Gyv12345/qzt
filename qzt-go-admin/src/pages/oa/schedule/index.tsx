import { useRef, useState, useEffect, useCallback } from 'react'
import { App, Button, Calendar, Card, Popconfirm, Space, Tag, Badge } from 'antd'
import type { Dayjs } from 'dayjs'
import { PlusOutlined, TableOutlined, CalendarOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { deleteSchedule, listSchedules, listScheduleCalendar } from '../../../services/oa'
import { SCHEDULE_TYPE_MAP, SCHEDULE_STATUS_MAP, type OaSchedule } from '../../../types/oa'
import ScheduleEditModal from './EditModal'

export default function SchedulePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [calendarData, setCalendarData] = useState<OaSchedule[]>([])
  const [calendarMonth, setCalendarMonth] = useState<Dayjs>()

  // 加载日历数据
  const loadCalendar = useCallback(async (month: Dayjs) => {
    const startDate = month.startOf('month').subtract(7, 'day').format('YYYY-MM-DD')
    const endDate = month.endOf('month').add(7, 'day').format('YYYY-MM-DD')
    const res = await listScheduleCalendar(startDate, endDate)
    setCalendarData(res.list || [])
  }, [])

  useEffect(() => {
    if (viewMode === 'calendar' && calendarMonth) {
      loadCalendar(calendarMonth)
    }
  }, [viewMode, calendarMonth, loadCalendar])

  // 获取某天的日程
  const getSchedulesByDay = (date: Dayjs): OaSchedule[] => {
    const dayStr = date.format('YYYY-MM-DD')
    return calendarData.filter((s) => {
      const startDay = s.start_time?.slice(0, 10)
      return startDay === dayStr
    })
  }

  const handleDelete = async (id: number) => {
    await deleteSchedule(id)
    message.success('已删除')
    if (viewMode === 'calendar' && calendarMonth) {
      loadCalendar(calendarMonth)
    }
    actionRef.current?.reload()
  }

  const columns: ProColumns<OaSchedule>[] = [
    { title: '编号', valueType: 'indexBorder', width: 60 },
    { title: '单号', dataIndex: 'schedule_no', width: 150, search: false },
    { title: '标题', dataIndex: 'title', width: 200, ellipsis: true },
    {
      title: '类型',
      dataIndex: 'event_type',
      width: 80,
      valueType: 'select',
      valueEnum: {
        MEETING: { text: '会议' },
        TASK: { text: '任务' },
        REMINDER: { text: '提醒' },
        OUT: { text: '外出' },
        OTHER: { text: '其他' },
      },
      render: (_, r) => {
        const m = SCHEDULE_TYPE_MAP[r.event_type] ?? SCHEDULE_TYPE_MAP.OTHER
        return <Tag color={m.color}>{m.text}</Tag>
      },
    },
    { title: '开始时间', dataIndex: 'start_time', width: 170, search: false, render: (_, r) => r.start_time?.slice(0, 16) },
    { title: '结束时间', dataIndex: 'end_time', width: 170, search: false, render: (_, r) => r.end_time?.slice(0, 16) },
    { title: '地点', dataIndex: 'location', width: 120, ellipsis: true, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      valueType: 'select',
      valueEnum: {
        PENDING: { text: '待处理' },
        DONE: { text: '已完成' },
        CANCELED: { text: '已取消' },
      },
      render: (_, r) => {
        const m = SCHEDULE_STATUS_MAP[r.status] ?? SCHEDULE_STATUS_MAP.PENDING
        return <Tag color={m.color}>{m.text}</Tag>
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="oa:schedule:edit">
            <Button type="link" size="small" onClick={() => { setEditingId(record.id); setEditOpen(true) }}>编辑</Button>
          </Auth>
          <Auth perm="oa:schedule:delete">
            <Popconfirm title="确认删除?" okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  // 日历单元格渲染
  const dateCellRender = (date: Dayjs) => {
    const list = getSchedulesByDay(date)
    if (list.length === 0) return null
    return (
      <div style={{ maxHeight: 80, overflow: 'hidden' }}>
        {list.slice(0, 3).map((s) => {
          const m = SCHEDULE_TYPE_MAP[s.event_type] ?? SCHEDULE_TYPE_MAP.OTHER
          return (
            <div key={s.id} style={{ marginBottom: 2 }}>
              <Badge color={m.color === 'default' ? '#d9d9d9' : undefined} status={m.color === 'default' ? 'default' : ('processing' as const)} text={
                <span style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', maxWidth: 80 }}>
                  {s.start_time?.slice(11, 16)} {s.title}
                </span>
              } />
            </div>
          )
        })}
        {list.length > 3 && <span style={{ fontSize: 11, color: '#999' }}>+{list.length - 3} 更多</span>}
      </div>
    )
  }

  const onOpenEdit = () => {
    setEditingId(null)
    setEditOpen(true)
  }

  const onSuccess = () => {
    if (viewMode === 'calendar' && calendarMonth) {
      loadCalendar(calendarMonth)
    }
    actionRef.current?.reload()
  }

  return (
    <>
      <Card
        title="日程安排"
        extra={
          <Space>
            <Button
              type={viewMode === 'calendar' ? 'primary' : 'default'}
              icon={<CalendarOutlined />}
              onClick={() => setViewMode('calendar')}
            >
              日历视图
            </Button>
            <Button
              type={viewMode === 'list' ? 'primary' : 'default'}
              icon={<TableOutlined />}
              onClick={() => setViewMode('list')}
            >
              列表视图
            </Button>
            <Auth perm="oa:schedule:add">
              <Button type="primary" icon={<PlusOutlined />} onClick={onOpenEdit}>新增日程</Button>
            </Auth>
          </Space>
        }
      >
        {viewMode === 'calendar' ? (
          <Calendar
            onPanelChange={(date) => setCalendarMonth(date)}
            cellRender={(date, info) => {
              if (info.type === 'date') return dateCellRender(date)
              return info.originNode
            }}
          />
        ) : (
          <ProTable<OaSchedule>
            rowKey="id"
            actionRef={actionRef}
            columns={columns}
            scroll={{ x: 'max-content' }}
            search={{ labelWidth: 'auto' }}
            request={async (params) => {
              const { current, pageSize, ...rest } = params
              const data = await listSchedules({ page: current || 1, page_size: pageSize || 10, ...rest })
              return { data: data.list, total: data.total, success: true }
            }}
            toolBarRender={false}
            pagination={{ defaultPageSize: 10 }}
          />
        )}
      </Card>
      <ScheduleEditModal open={editOpen} editingId={editingId} onOpenChange={setEditOpen} onSuccess={onSuccess} />
    </>
  )
}
