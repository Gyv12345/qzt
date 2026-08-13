import { useEffect, useState } from 'react'
import { NavBar, Card, Tag, ErrorBlock, SpinLoading, Button, Dialog, List, Toast } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import { getPurchaseReturn, stockOutPurchaseReturn } from '../../../services/psi'
import { RETURN_STATUS, type PsiPurchaseReturn } from '../../../types/psi'

export default function PurchaseReturnDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<PsiPurchaseReturn | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [acting, setActing] = useState(false)

  const reload = () => {
    if (!id) return
    setLoading(true)
    getPurchaseReturn(Number(id))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(reload, [id])

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><SpinLoading /></div>
  if (error || !data) return <ErrorBlock status="empty" />

  const s = RETURN_STATUS[data.status] || RETURN_STATUS[1]
  const items = (data as any).items || []
  const canExec = data.status === 1

  const onStockOut = async () => {
    const ok = await Dialog.confirm({ content: '确认执行退货出库?' })
    if (!ok) return
    setActing(true)
    try {
      await stockOutPurchaseReturn(data.id)
      Toast.show({ icon: 'success', content: '已出库' })
      reload()
    } catch {
    } finally {
      setActing(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>采购退货详情</NavBar>
      <div style={{ padding: 12 }}>
        <Card title="基本信息" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>{data.return_no}</span>
            <Tag color={s.color} fill="outline">{s.text}</Tag>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            <div>供应商: {data.supplier_name || '-'}</div>
            <div>退货日期: {data.return_date ? data.return_date.slice(0, 10) : '-'}</div>
            <div>创建时间: {data.created_at?.slice(0, 16)}</div>
          </div>
        </Card>

        {items.length > 0 && (
          <Card title={`商品明细(${items.length})`} style={{ marginBottom: 12 }}>
            <List>
              {items.map((it: any) => (
                <List.Item
                  key={it.id || it.product_id}
                  extra={<span style={{ color: '#ff4d4f' }}>¥{Number(it.amount || (it.quantity * it.unit_price) || 0).toFixed(2)}</span>}
                  description={<span style={{ fontSize: 12 }}>{it.quantity} × ¥{Number(it.unit_price || 0).toFixed(2)}</span>}
                >
                  {it.product_name || `商品#${it.product_id}`}
                </List.Item>
              ))}
            </List>
          </Card>
        )}

        <Card title="金额信息" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span>退货总额</span>
            <span style={{ fontWeight: 600, color: '#ff4d4f' }}>¥{Number(data.total_amount || 0).toFixed(2)}</span>
          </div>
        </Card>

        {canExec && (
          <Button block color="warning" fill="outline" loading={acting} onClick={onStockOut}>执行退货出库</Button>
        )}
      </div>
    </div>
  )
}
