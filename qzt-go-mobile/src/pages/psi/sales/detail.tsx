import { useEffect, useState } from 'react'
import { NavBar, Card, Tag, ErrorBlock, SpinLoading, Button, Dialog, List, Toast } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteSalesOrder, getSalesOrder, stockOutSalesOrder } from '../../../services/psi'
import type { PsiSalesOrder } from '../../../types/psi'
import SalesOrderSheet from '../../../components/SalesOrderSheet'

const SALES_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '待出库', color: 'warning' },
  2: { text: '已出库', color: 'success' },
  3: { text: '已关闭', color: 'default' },
}

export default function SalesDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<PsiSalesOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [acting, setActing] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const reload = () => {
    if (!id) return
    setLoading(true)
    getSalesOrder(Number(id))
      .then((res) => setData(res))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(reload, [id])

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><SpinLoading /></div>
  if (error || !data) return <ErrorBlock status="empty" />

  const st = SALES_STATUS[data.status] || SALES_STATUS[1]
  const items = (data as any).items || []
  const canExec = data.status === 1

  const onDelete = async () => {
    const ok = await Dialog.confirm({ content: '确定删除该销售单?' })
    if (!ok) return
    setActing(true)
    try {
      await deleteSalesOrder(data.id)
      Toast.show({ icon: 'success', content: '已删除' })
      navigate(-1)
    } catch {
    } finally {
      setActing(false)
    }
  }

  const onStockOut = async () => {
    const ok = await Dialog.confirm({ content: '确认执行出库?' })
    if (!ok) return
    setActing(true)
    try {
      await stockOutSalesOrder(data.id)
      Toast.show({ icon: 'success', content: '已出库' })
      reload()
    } catch {
    } finally {
      setActing(false)
    }
  }

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
            {(data as any).remark && <div>备注: {(data as any).remark}</div>}
          </div>
        </Card>

        {items.length > 0 && (
          <Card title={`商品明细(${items.length})`} style={{ marginBottom: 12 }}>
            <List>
              {items.map((it: any) => (
                <List.Item
                  key={it.id || it.product_id}
                  extra={<span style={{ color: 'var(--brand)' }}>¥{Number(it.amount || (it.quantity * it.unit_price) || 0).toFixed(2)}</span>}
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
            <span>销售总额</span>
            <span style={{ fontWeight: 600, color: 'var(--brand)' }}>¥{Number(data.total_amount || 0).toFixed(2)}</span>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 8 }}>
          {canExec && (
            <Button block color="primary" fill="outline" loading={acting} onClick={onStockOut}>执行出库</Button>
          )}
          <Button block color="primary" fill="outline" onClick={() => setShowEdit(true)}>编辑</Button>
          <Button block color="danger" fill="outline" loading={acting} onClick={onDelete}>删除</Button>
        </div>
      </div>

      <SalesOrderSheet visible={showEdit} order={data} onClose={() => setShowEdit(false)} onSubmitted={reload} />
    </div>
  )
}
