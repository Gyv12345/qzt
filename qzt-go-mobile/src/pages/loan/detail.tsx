import { useEffect, useState } from 'react'
import { Button, Card, Dialog, ErrorBlock, List, NavBar, SpinLoading, Tag } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import { getLoan, submitLoanApproval, markLoanRepaid } from '../../services/oa'
import type { OaLoan } from '../../types/oa'
import { APPROVAL_STATUS } from '../../types/oa'

export default function LoanDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loan, setLoan] = useState<OaLoan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = () => {
    if (!id) return
    setLoading(true)
    getLoan(Number(id)).then(setLoan).catch(() => setError(true)).finally(() => setLoading(false))
  }
  useEffect(load, [id])

  if (loading) return <div style={{ paddingTop: '40vh', textAlign: 'center' }}><SpinLoading style={{ '--size': '40px' }} /></div>
  if (error || !loan) return <ErrorBlock status="default" title="加载失败" />

  const s = APPROVAL_STATUS[loan.approval_status] || APPROVAL_STATUS.NONE

  const handleSubmit = async () => {
    const ok = await Dialog.confirm({ content: '提交审批?' })
    if (!ok) return
    await submitLoanApproval(loan.id)
    Dialog.alert({ content: '已提交审批' })
    navigate(-1)
  }

  const handleRepaid = async () => {
    const ok = await Dialog.confirm({ content: '确认标记已还清?' })
    if (!ok) return
    await markLoanRepaid(loan.id)
    Dialog.alert({ content: '已标记还清' })
    load()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>借款详情</NavBar>
      <Card title="基本信息" style={{ margin: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{loan.title}</span>
          <Tag color={s.color} fill="outline">{s.text}</Tag>
        </div>
        <List>
          <List.Item extra={loan.loan_no}>单号</List.Item>
          <List.Item extra={loan.loan_type}>类型</List.Item>
          <List.Item extra={`¥${Number(loan.amount).toFixed(2)}`}>金额</List.Item>
          <List.Item extra={loan.expected_date?.slice(0, 10) || '-'}>预计还款</List.Item>
          <List.Item extra={`¥${Number(loan.repaid_amount).toFixed(2)}`}>已还</List.Item>
          {loan.reason && <List.Item extra={loan.reason}>事由</List.Item>}
        </List>
      </Card>

      <div style={{ padding: 16 }}>
        {loan.approval_status === 'NONE' && (
          <Button block color="primary" onClick={handleSubmit}>提交审批</Button>
        )}
        {loan.approval_status === 'APPROVED' && loan.repaid_status !== 2 && (
          <Button block color="success" fill="outline" onClick={handleRepaid} style={{ marginTop: 8 }}>标记已还清</Button>
        )}
      </div>
    </div>
  )
}
