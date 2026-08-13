import { useEffect, useState } from 'react'
import { ActionSheet, Button, Card, Dialog, ErrorBlock, List, NavBar, SpinLoading, Steps, Tag, Toast } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import { changeTicketStatus, deleteTicket, getTicket, updateTicket } from '../../services/crm'
import type { TicketDetail } from '../../types/crm'
import { TICKET_STATUS } from '../../types/crm'
import FormSheet from '../../components/FormSheet'

const STATUS_OPTIONS = [
  { label: '待处理', value: 1 },
  { label: '处理中', value: 2 },
  { label: '已解决', value: 3 },
  { label: '已关闭', value: 4 },
  { label: '已重开', value: 5 },
]

export default function TicketDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<TicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [acting, setActing] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const reload = () => {
    if (!id) return
    setLoading(true)
    setError(false)
    getTicket(Number(id))
      .then(setDetail)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(reload, [id])

  if (loading) {
    return <div style={{ paddingTop: '40vh', textAlign: 'center' }}><SpinLoading style={{ '--size': '40px' }} /></div>
  }
  if (error || !detail) {
    return <ErrorBlock status="default" title="加载失败" />
  }

  const { ticket: t, logs } = detail
  const s = TICKET_STATUS[t.status] || TICKET_STATUS[1]

  const onChangeStatus = () => {
    ActionSheet.show({
      actions: STATUS_OPTIONS.map((o) => ({ text: o.label, key: String(o.value) })),
      cancelText: '取消',
      onAction: async (item) => {
        const status = Number(item.key)
        setActing(true)
        try {
          await changeTicketStatus(t.id, { status, comment: '移动端变更' })
          Toast.show({ icon: 'success', content: '状态已更新' })
          reload()
        } catch {
        } finally {
          setActing(false)
        }
      },
    })
  }

  const onDelete = async () => {
    const ok = await Dialog.confirm({ content: `确定删除工单「${t.title}」?` })
    if (!ok) return
    setActing(true)
    try {
      await deleteTicket(t.id)
      Toast.show({ icon: 'success', content: '已删除' })
      navigate(-1)
    } catch {
    } finally {
      setActing(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 24 }}>
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

      <div style={{ margin: 8, display: 'flex', gap: 8 }}>
        <Button block color="primary" fill="outline" onClick={onChangeStatus} loading={acting}>变更状态</Button>
        <Button block color="primary" fill="outline" onClick={() => setShowEdit(true)}>编辑</Button>
        <Button block color="danger" fill="outline" onClick={onDelete} loading={acting}>删除</Button>
      </div>

      <FormSheet
        visible={showEdit}
        title="编辑工单"
        fields={[
          { name: 'title', label: '工单标题', type: 'text', required: true },
          { name: 'customer_name', label: '客户名称', type: 'text' },
          { name: 'contact_name', label: '联系人', type: 'text' },
          { name: 'contact_phone', label: '联系电话', type: 'text' },
          { name: 'category', label: '类型', type: 'text' },
          { name: 'description', label: '问题描述', type: 'textarea' },
        ]}
        initialValues={{
          title: t.title,
          customer_name: t.customer_name,
          contact_name: t.contact_name,
          contact_phone: t.contact_phone,
          category: t.category,
          description: t.description,
        }}
        onClose={() => setShowEdit(false)}
        onSubmit={async (v) => {
          await updateTicket(t.id, {
            title: v.title,
            customer_name: v.customer_name || undefined,
            contact_name: v.contact_name || undefined,
            contact_phone: v.contact_phone || undefined,
            category: v.category || undefined,
            description: v.description || undefined,
          })
          reload()
        }}
      />
    </div>
  )
}
