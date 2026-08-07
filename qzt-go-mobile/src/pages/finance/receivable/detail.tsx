import { useEffect, useState } from 'react'
import { Button, Card, Dialog, ErrorBlock, List, NavBar, SpinLoading, Tag } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import { getReceivable, settleReceivable } from '../../../services/finance'
import type { FinReceivable } from '../../../types/finance'
import { SETTLE_STATUS, DIRECTION_TEXT } from '../../../types/finance'

export default function ReceivableDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [rec, setRec] = useState<FinReceivable | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = () => {
    if (!id) return
    setLoading(true)
    getReceivable(Number(id)).then(setRec).catch(() => setError(true)).finally(() => setLoading(false))
  }
  useEffect(load, [id])

  if (loading) return <div style={{ paddingTop: '40vh', textAlign: 'center' }}><SpinLoading style={{ '--size': '40px' }} /></div>
  if (error || !rec) return <ErrorBlock status="default" title="加载失败" />

  const d = DIRECTION_TEXT[rec.direction] || { text: rec.direction, color: 'default' }
  const s = SETTLE_STATUS[rec.status] || SETTLE_STATUS[0]
  const remaining = Number(rec.original_amount) - Number(rec.settled_amount)

  const handleSettle = async () => {
    const ok = await Dialog.confirm({ content: `确认结算剩余 ¥${remaining.toFixed(2)} ?` })
    if (!ok) return
    await settleReceivable(rec.id, String(remaining.toFixed(2)))
    Dialog.alert({ content: '结算成功' })
    load()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>往来款详情</NavBar>
      <Card title="基本信息" style={{ margin: 8 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Tag color={d.color} fill="outline">{d.text}</Tag>
          <Tag color={s.color} fill="outline">{s.text}</Tag>
        </div>
        <List>
          <List.Item extra={rec.doc_no}>单号</List.Item>
          <List.Item extra={rec.party_name}>往来方</List.Item>
          <List.Item extra={`¥${Number(rec.original_amount).toFixed(2)}`}>原始金额</List.Item>
          <List.Item extra={`¥${Number(rec.settled_amount).toFixed(2)}`}>已结算</List.Item>
          <List.Item extra={<span style={{ color: '#ff4d4f', fontWeight: 600 }}>¥{remaining.toFixed(2)}</span>}>剩余</List.Item>
          <List.Item extra={rec.occur_date?.slice(0, 10)}>发生日期</List.Item>
          {rec.due_date && <List.Item extra={rec.due_date.slice(0, 10)}>到期日期</List.Item>}
        </List>
      </Card>
      {rec.status !== 2 && remaining > 0 && (
        <div style={{ padding: 16 }}>
          <Button block color="primary" onClick={handleSettle}>结算 ¥{remaining.toFixed(2)}</Button>
        </div>
      )}
    </div>
  )
}
