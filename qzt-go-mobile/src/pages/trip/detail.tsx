import { useEffect, useState } from 'react'
import { Button, Card, Dialog, ErrorBlock, List, NavBar, SpinLoading, Tag } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import { getTrip, submitTripApproval } from '../../services/oa'
import type { OaBusinessTrip } from '../../types/oa'
import { APPROVAL_STATUS } from '../../types/oa'

export default function TripDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<OaBusinessTrip | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getTrip(Number(id)).then(setTrip).catch(() => setError(true)).finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ paddingTop: '40vh', textAlign: 'center' }}><SpinLoading style={{ '--size': '40px' }} /></div>
  if (error || !trip) return <ErrorBlock status="default" title="加载失败" />

  const s = APPROVAL_STATUS[trip.approval_status] || APPROVAL_STATUS.NONE

  const handleSubmit = async () => {
    const ok = await Dialog.confirm({ content: '提交审批?' })
    if (!ok) return
    await submitTripApproval(trip.id)
    Dialog.alert({ content: '已提交审批' })
    navigate(-1)
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>出差详情</NavBar>
      <Card title="基本信息" style={{ margin: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{trip.title}</span>
          <Tag color={s.color} fill="outline">{s.text}</Tag>
        </div>
        <List>
          <List.Item extra={trip.trip_no}>单号</List.Item>
          <List.Item extra={trip.destination}>目的地</List.Item>
          <List.Item extra={trip.start_date?.slice(0, 10)}>出发</List.Item>
          <List.Item extra={trip.end_date?.slice(0, 10)}>返回</List.Item>
          <List.Item extra={trip.transport || '-'}>交通方式</List.Item>
          {trip.budget_amount && <List.Item extra={`¥${trip.budget_amount}`}>预算</List.Item>}
          {trip.purpose && <List.Item extra={trip.purpose}>出差目的</List.Item>}
        </List>
      </Card>
      {trip.approval_status === 'NONE' && (
        <div style={{ padding: 16 }}>
          <Button block color="primary" onClick={handleSubmit}>提交审批</Button>
        </div>
      )}
    </div>
  )
}
