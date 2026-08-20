import { useRef, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { App, Button, Calendar, Card, Checkbox, Popconfirm, Space, Tag } from 'antd'
import type { Dayjs } from 'dayjs'
import { PlusOutlined, TableOutlined, CalendarOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { deleteSchedule, listSchedules } from '../../../services/oa'
import { listCalendarEvents } from '../../../services/dashboard'
import {
  SCHEDULE_TYPE_MAP,
  SCHEDULE_STATUS_MAP,
  CALENDAR_SOURCE_CONFIG,
  CALENDAR_SOURCE_KEYS,
  type OaSchedule,
  type CalendarEvent,
} from '../../../types/oa'
import ScheduleEditModal from './EditModal'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function SchedulePage() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [calendarData, setCalendarData] = useState<CalendarEvent[]>([])
  const [calendarMonth, setCalendarMonth] = useState<Dayjs>()
  // 来源筛选(默认全选)
  const [sources, setSources] = useState<string[]>(CALENDAR_SOURCE_KEYS)

  // 加载日历聚合数据
  const loadCalendar = useCallback(async (month: Dayjs, selectedSources: string[]) => {
    // 来源全取消时直接清空(后端约定 sources 为空=全部,前端需显式区分)
    if (selectedSources.length === 0) {
      setCalendarData([])
      return
    }
    const startDate = month.startOf('month').subtract(7, 'day').format('YYYY-MM-DD')
    const endDate = month.endOf('month').add(7, 'day').format('YYYY-MM-DD')
    try {
      const res = await listCalendarEvents(startDate, endDate, selectedSources)
      setCalendarData(res.list || [])
    } catch {
      setCalendarData([])
    }
  }, [])

  useEffect(() => {
    if (viewMode === 'calendar' && calendarMonth) {
      loadCalendar(calendarMonth, sources)
    }
  }, [viewMode, calendarMonth, sources, loadCalendar])

  // 获取某天的事件(按 start_time 的日期部分匹配)
  const getEventsByDay = (date: Dayjs): CalendarEvent[] => {
    const dayStr = date.format('YYYY-MM-DD')
    return calendarData.filter((e) => (e.start_time || '').slice(0, 10) === dayStr)
  }

  const handleDelete = async (id: number) => {
    await deleteSchedule(id)
    message.success('已删除')
    if (viewMode === 'calendar' && calendarMonth) {
      loadCalendar(calendarMonth, sources)
    }
    actionRef.current?.reload()
  }

  // 点击事件:schedule 来源→打开编辑弹窗;其他来源→跳转对应模块
  const handleEventClick = (ev: CalendarEvent) => {
    if (ev.source === 'schedule') {
      setEditingId(ev.id)
      setEditOpen(true)
      return
    }
    const cfg = CALENDAR_SOURCE_CONFIG[ev.source]
    if (cfg) navigate(cfg.link(ev.id))
  }

  const columns: ProColumns<OaSchedule>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
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

  // 日历单元格渲染:按来源配色,点击交互
  const dateCellRender = (date: Dayjs) => {
    const list = getEventsByDay(date)
    if (list.length === 0) return null
    return (
      <div style={{ maxHeight: 80, overflow: 'hidden' }}>
        {list.slice(0, 3).map((ev) => {
          const cfg = CALENDAR_SOURCE_CONFIG[ev.source] || { color: 'default' }
          const timePrefix = ev.all_day ? '' : (ev.start_time?.slice(11, 16) + ' ')
          return (
            <div
              key={ev.source + '_' + ev.id}
              onClick={() => handleEventClick(ev)}
              style={{ marginBottom: 2, cursor: 'pointer' }}
              title={ev.title}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: dotColor(cfg.color),
                  marginRight: 4,
                  verticalAlign: 'middle',
                }}
              />
              <span
                style={{
                  fontSize: 12,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  maxWidth: 88,
                  verticalAlign: 'middle',
                }}
              >
                {timePrefix}{ev.title}
              </span>
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
      loadCalendar(calendarMonth, sources)
    }
    actionRef.current?.reload()
  }

  return (
    <>
      <Card
        title="日程安排"
        extra={
          <Space wrap>
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
          <>
            <div style={{ marginBottom: 12 }}>
              <Checkbox.Group
                value={sources}
                onChange={(vals) => setSources(vals as string[])}
                options={CALENDAR_SOURCE_KEYS.map((k) => ({
                  label: (
                    <span>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: dotColor(CALENDAR_SOURCE_CONFIG[k].color), marginRight: 6, verticalAlign: 'middle' }} />
                      {CALENDAR_SOURCE_CONFIG[k].label}
                    </span>
                  ),
                  value: k,
                }))}
              />
            </div>
            <Calendar
              onPanelChange={(date) => setCalendarMonth(date)}
              cellRender={(date, info) => {
                if (info.type === 'date') return dateCellRender(date)
                return info.originNode
              }}
            />
          </>
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

// antd 预设色名 → 可用 CSS 颜色(用于日历圆点,非 Badge 组件场景)
const COLOR_MAP: Record<string, string> = {
  blue: '#1677ff', gold: '#faad14', green: '#52c41a', cyan: '#13c2c2',
  purple: '#722ed1', orange: '#fa8c16', red: '#f5222d', default: '#d9d9d9',
  geekblue: '#2f54eb', lime: '#a0d911', magenta: '#eb2f96', volcano: '#fa541c',
}
function dotColor(c: string): string {
  return COLOR_MAP[c] || '#d9d9d9'
}
