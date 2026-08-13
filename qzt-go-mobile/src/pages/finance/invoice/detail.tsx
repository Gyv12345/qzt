import { useEffect, useState } from 'react'
import { Card, ErrorBlock, NavBar, SpinLoading, Tag } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import { getInvoice } from '../../../services/finance'
import { INVOICE_DIRECTION, INVOICE_TYPE, type FinInvoice } from '../../../types/finance'

export default function InvoiceDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<FinInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(false)
    getInvoice(Number(id))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>发票详情</NavBar>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><SpinLoading /></div>
      ) : error || !data ? (
        <ErrorBlock status="empty" description="加载失败" />
      ) : (
        <div style={{ padding: 12 }}>
          <Card title="基本信息">
            <div style={{ fontSize: 14, lineHeight: 2 }}>
              <div>发票号:{data.invoice_no}</div>
              <div>类型:{INVOICE_TYPE[data.invoice_type] || data.invoice_type}</div>
              <div>方向:<Tag color={INVOICE_DIRECTION[data.direction]?.color} fill="outline">{INVOICE_DIRECTION[data.direction]?.text}</Tag></div>
              <div>日期:{data.invoice_date}</div>
              <div>对方:{data.party_name || '-'}{data.party_tax_no ? ` · ${data.party_tax_no}` : ''}</div>
              {data.remark && <div>备注:{data.remark}</div>}
            </div>
          </Card>
          <Card title="金额" style={{ marginTop: 12 }}>
            <div style={{ fontSize: 14, lineHeight: 2 }}>
              <div>不含税:¥{Number(data.amount || 0).toFixed(2)}</div>
              <div>税率:{(Number(data.tax_rate || 0) * 100).toFixed(0)}%</div>
              <div>税额:¥{Number(data.tax_amount || 0).toFixed(2)}</div>
              <div style={{ color: '#ff4d4f', fontWeight: 600 }}>价税合计:¥{Number(data.total_amount || 0).toFixed(2)}</div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
