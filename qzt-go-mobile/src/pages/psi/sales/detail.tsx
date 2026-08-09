import { useEffect, useState } from 'react'
import { NavBar, Card, Tag, ErrorBlock, SpinLoading } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import { getSalesOrder } from '../../../services/psi'
import type { PsiSalesOrder } from '../../../types/psi'

const SALES_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '待出库', color: 'warning' },
  2: { text: '已出库', color: 'success' },
  3: { text: '已关闭', color: 'default' },
}

export default function SalesDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [data, setData] = useState<PsiSalesOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getSalesOrder(Number(id))
      .then((res) => setData(res))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><SpinLoading /></div>
  if (error || !data) return <ErrorBlock status="empty" />

  const st = SALES_STATUS[data.status] || SALES_STATUS[1]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>销售单详情</NavBar>
      <div style={{ padding: 12 }}>
        <Card title="基本信息" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>{data.order_no}</span>
            <Tag color={st.color} fill="outline">{st.text}</Tag>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            <div>客户: {data.customer_name || '-'}</div>
            <div>创建时间: {data.created_at?.slice(0, 16)}</div>
          </div>
        </Card>
        <Card title="金额信息">
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span>销售总额</span>
            <span style={{ fontWeight: 600, color: 'var(--danger)' }}>¥{Number(data.total_amount || 0).toFixed(2)}</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
