import { useEffect, useState } from 'react'
import { NavBar, Card, Tag, ErrorBlock, SpinLoading } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import { getSalesReturn } from '../../../services/psi'
import { RETURN_STATUS, type PsiSalesReturn } from '../../../types/psi'

export default function SalesReturnDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [data, setData] = useState<PsiSalesReturn | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getSalesReturn(Number(id))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><SpinLoading /></div>
  if (error || !data) return <ErrorBlock status="empty" />

  const s = RETURN_STATUS[data.status] || RETURN_STATUS[1]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>销售退货详情</NavBar>
      <div style={{ padding: 12 }}>
        <Card title="基本信息" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>{data.return_no}</span>
            <Tag color={s.color} fill="outline">{s.text}</Tag>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            <div>客户: {data.customer_name || '-'}</div>
            <div>退货日期: {data.return_date ? data.return_date.slice(0, 10) : '-'}</div>
            <div>创建时间: {data.created_at?.slice(0, 16)}</div>
          </div>
        </Card>
        <Card title="金额信息">
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span>退货总额</span>
            <span style={{ fontWeight: 600, color: '#f5222d' }}>¥{Number(data.total_amount || 0).toFixed(2)}</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
