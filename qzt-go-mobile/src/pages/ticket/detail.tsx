import { useEffect, useState } from 'react'
import { Card, ErrorBlock, List, NavBar, SpinLoading, Tag, Steps } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import { getTicket } from '../../services/crm'
import type { TicketDetail } from '../../types/crm'
import { TICKET_STATUS } from '../../types/crm'

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getTicket(Number(id)).then(setDetail).catch(() => setError(true)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ paddingTop: '40vh', textAlign: 'center' }}><SpinLoading style={{ '--size': '40px' }} /></div>
  if (error || !detail) return <ErrorBlock status="default" title="加载失败" />

  const { ticket: t, logs } = detail
  const s = TICKET_STATUS[t.status] || TICKET_STATUS[1]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>工单详情</NavBar>
      <Card title="工单信息" style={{ margin: 8 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{t.title}</span>
          <Tag color={s.color} fill="outline">{s.text}</Tag>
        </div>
        <List>
          <List.Item extra={t.ticket_no}>工单号</List.Item>
          <List.Item extra={t.customer_name || '-'}>客户</List.Item>
          <List.Item extra={t.contact_name || '-'}>联系人</List.Item>
          <List.Item extra={t.contact_phone || '-'}>电话</List.Item>
          <List.Item extra={t.category || '-'}>类型</List.Item>
          {t.description && <List.Item extra={t.description}>描述</List.Item>}
          {t.solution && <List.Item extra={t.solution}>解决方案</List.Item>}
        </List>
      </Card>

      {logs && logs.length > 0 && (
        <Card title="处理日志" style={{ margin: 8 }}>
          <Steps direction="vertical">
            {logs.map((log) => (
              <Steps.Step
                key={log.id}
                title={TICKET_STATUS[log.new_status]?.text || ''}
                description={`${log.content} · ${log.created_at?.slice(5, 16) || ''}`}
              />
            ))}
          </Steps>
        </Card>
      )}
    </div>
  )
}
