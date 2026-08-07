import { useEffect, useState } from 'react'
import { Button, Card, Dialog, ErrorBlock, List, NavBar, SpinLoading, Tag } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import { listLeaves, submitLeaveApproval } from '../../../services/hrm'
import type { HrmLeave } from '../../../types/hrm'
import { LEAVE_TYPE, LEAVE_APPROVAL_STATUS } from '../../../types/hrm'

export default function LeaveDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [leave, setLeave] = useState<HrmLeave | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    listLeaves({ page: 1, page_size: 100 })
      .then((res) => {
        const found = res.list.find((l) => l.id === Number(id))
        if (found) setLeave(found)
        else setError(true)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ paddingTop: '40vh', textAlign: 'center' }}><SpinLoading style={{ '--size': '40px' }} /></div>
  if (error || !leave) return <ErrorBlock status="default" title="加载失败" />

  const s = LEAVE_APPROVAL_STATUS[leave.approval_status] || LEAVE_APPROVAL_STATUS.NONE

  const handleSubmit = async () => {
    const ok = await Dialog.confirm({ content: '提交审批?' })
    if (!ok) return
    await submitLeaveApproval(leave.id)
    Dialog.alert({ content: '已提交审批' })
    navigate(-1)
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>请假详情</NavBar>
      <Card title="基本信息" style={{ margin: 8 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <Tag color={s.color} fill="outline">{s.text}</Tag>
          <Tag fill="outline">{LEAVE_TYPE[leave.leave_type] || leave.leave_type}</Tag>
        </div>
        <List>
          <List.Item extra={leave.leave_no}>单号</List.Item>
          <List.Item extra={leave.start_date?.slice(0, 10)}>开始</List.Item>
          <List.Item extra={leave.end_date?.slice(0, 10)}>结束</List.Item>
          <List.Item extra={`${leave.duration_days}天`}>天数</List.Item>
          {leave.reason && <List.Item extra={leave.reason}>事由</List.Item>}
        </List>
      </Card>
      {leave.approval_status === 'NONE' && (
        <div style={{ padding: 16 }}>
          <Button block color="primary" onClick={handleSubmit}>提交审批</Button>
        </div>
      )}
    </div>
  )
}
