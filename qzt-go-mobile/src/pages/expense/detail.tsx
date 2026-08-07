import { useEffect, useState } from 'react'
import { Button, Card, Dialog, ErrorBlock, List, NavBar, SpinLoading, Tag } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import { getExpense, submitExpenseApproval } from '../../services/oa'
import type { OaExpenseDetail } from '../../types/oa'
import { APPROVAL_STATUS, EXPENSE_TYPE } from '../../types/oa'

export default function ExpenseDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<OaExpenseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getExpense(Number(id)).then(setDetail).catch(() => setError(true)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ paddingTop: '40vh', textAlign: 'center' }}><SpinLoading style={{ '--size': '40px' }} /></div>
  if (error || !detail) return <ErrorBlock status="default" title="加载失败" description="报销详情获取失败" />

  const { expense: e, items } = detail
  const s = APPROVAL_STATUS[e.approval_status] || APPROVAL_STATUS.NONE

  const handleSubmit = async () => {
    const ok = await Dialog.confirm({ content: '提交审批?' })
    if (!ok) return
    await submitExpenseApproval(e.id)
    Dialog.alert({ content: '已提交审批' })
    navigate(-1)
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>报销详情</NavBar>

      <Card title="基本信息" style={{ margin: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{e.title}</span>
          <Tag color={s.color} fill="outline">{s.text}</Tag>
          {e.payment_status === 1 && <Tag color="success" fill="outline">已打款</Tag>}
        </div>
        <List>
          <List.Item extra={e.expense_no}>单号</List.Item>
          <List.Item extra={EXPENSE_TYPE[e.expense_type] || e.expense_type}>费用类型</List.Item>
          <List.Item extra={`¥${Number(e.amount).toFixed(2)}`}>金额</List.Item>
          <List.Item extra={e.occur_date?.slice(0, 10) || '-'}>发生日期</List.Item>
          {e.description && <List.Item extra={e.description}>说明</List.Item>}
          <List.Item extra={e.created_at}>创建时间</List.Item>
        </List>
      </Card>

      {items && items.length > 0 && (
        <Card title={`费用明细(${items.length})`} style={{ margin: 8 }}>
          <List>
            {items.map((it) => (
              <List.Item
                key={it.id}
                description={<span style={{ fontSize: 12 }}>{it.invoice_no ? `发票:${it.invoice_no} · ` : ''}¥{Number(it.amount).toFixed(2)}</span>}
                extra={it.remark || ''}
              >
                {it.item_type || '明细'}
              </List.Item>
            ))}
          </List>
        </Card>
      )}

      {e.approval_status === 'NONE' && (
        <div style={{ padding: 16 }}>
          <Button block color="primary" onClick={handleSubmit}>提交审批</Button>
        </div>
      )}
    </div>
  )
}
