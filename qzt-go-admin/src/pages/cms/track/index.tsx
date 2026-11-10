import { useCallback, useEffect, useState } from 'react'
import { Card, Col, Row, Segmented, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import Chart, { barOption, lineOption } from '../../../components/Chart'
import {
  getTrackSummary,
  listTrackEvents,
  type CmsTrackEvent,
  type TrackSummary,
} from '../../../services/cms'

const DAY_OPTIONS = [
  { label: '近 7 天', value: 7 },
  { label: '近 30 天', value: 30 },
  { label: '近 90 天', value: 90 },
]

/** 事件名中文说明(未知事件原样展示,新点位无需改这里) */
const EVENT_LABELS: Record<string, string> = {
  pageview: '页面浏览',
  contact_submit: '留言提交',
  click_contact: '点击联系入口',
  click_demo: '点击在线体验',
  click_product: '点击产品',
  click_article: '点击文章',
}

const eventLabel = (e: string) => EVENT_LABELS[e] || e

function Stat({ title, value }: { title: string; value?: number }) {
  return (
    <Card size="small">
      <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)' }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 600, marginTop: 4 }}>{value ?? 0}</div>
    </Card>
  )
}

export default function CmsTrackPage() {
  const [days, setDays] = useState(7)
  const [summary, setSummary] = useState<TrackSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [events, setEvents] = useState<CmsTrackEvent[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [eventsLoading, setEventsLoading] = useState(true)

  const loadSummary = useCallback((d: number) => {
    setSummaryLoading(true)
    getTrackSummary(d)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false))
  }, [])

  useEffect(() => {
    loadSummary(days)
  }, [days, loadSummary])

  useEffect(() => {
    setEventsLoading(true)
    listTrackEvents({ page, page_size: 10, days })
      .then((res) => {
        setEvents(res.list ?? [])
        setTotal(res.total ?? 0)
      })
      .catch(() => {
        setEvents([])
        setTotal(0)
      })
      .finally(() => setEventsLoading(false))
  }, [days, page])

  const daily = summary?.daily ?? []

  const eventColumns: ColumnsType<CmsTrackEvent> = [
    { title: '时间', dataIndex: 'created_at', width: 170 },
    { title: '事件', dataIndex: 'event', width: 120, render: (v: string) => eventLabel(v) },
    { title: '页面', dataIndex: 'path', ellipsis: true },
    {
      title: '来源',
      dataIndex: 'referrer',
      ellipsis: true,
      render: (v: string) => (v ? <span title={v}>{v.replace(/^https?:\/\//, '')}</span> : '-'),
    },
    { title: 'IP', dataIndex: 'ip', width: 130 },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card
        size="small"
        title="官网访问统计"
        extra={
          <Segmented size="small" options={DAY_OPTIONS} value={days} onChange={(v) => setDays(v as number)} />
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={12} lg={4}>
            <Stat title="今日 PV" value={summary?.today_pv} />
          </Col>
          <Col xs={12} lg={4}>
            <Stat title="今日 UV" value={summary?.today_uv} />
          </Col>
          <Col xs={12} lg={4}>
            <Stat title="昨日 PV" value={summary?.yesterday_pv} />
          </Col>
          <Col xs={12} lg={4}>
            <Stat title="昨日 UV" value={summary?.yesterday_uv} />
          </Col>
          <Col xs={12} lg={4}>
            <Stat title={`窗口 PV(${days}天)`} value={summary?.pv} />
          </Col>
          <Col xs={12} lg={4}>
            <Stat title={`窗口 UV(${days}天)`} value={summary?.uv} />
          </Col>
        </Row>
      </Card>

      <Card size="small" title="每日 PV / UV" loading={summaryLoading}>
        <Chart
          option={lineOption('每日 PV / UV', daily.map((d) => d.date.slice(5)), [
            { name: 'PV', data: daily.map((d) => Number(d.pv)) },
            { name: 'UV', data: daily.map((d) => Number(d.uv)) },
          ])}
        />
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card size="small" title="热门页面 Top 10" loading={summaryLoading}>
            <Chart
              option={barOption('热门页面', (summary?.top_pages ?? []).map((p) => p.name || '/'), [
                { name: 'PV', data: (summary?.top_pages ?? []).map((p) => Number(p.count)) },
              ], true)}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" title="事件 Top 10" loading={summaryLoading}>
            <Chart
              option={barOption('事件分布', (summary?.top_events ?? []).map((e) => eventLabel(e.name)), [
                { name: '次数', data: (summary?.top_events ?? []).map((e) => Number(e.count)) },
              ], true)}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card size="small" title="来源 Top 10" loading={summaryLoading}>
            <Chart
              option={barOption('来源分布', (summary?.top_referrers ?? []).map((r) => r.name.replace(/^https?:\/\//, '')), [
                { name: '次数', data: (summary?.top_referrers ?? []).map((r) => Number(r.count)) },
              ], true)}
            />
          </Card>
        </Col>
      </Row>

      <Card size="small" title="最近事件">
        <Table<CmsTrackEvent>
          rowKey="id"
          size="small"
          loading={eventsLoading}
          columns={eventColumns}
          dataSource={events}
          pagination={{ current: page, pageSize: 10, total, onChange: setPage, showSizeChanger: false }}
        />
      </Card>
    </div>
  )
}
