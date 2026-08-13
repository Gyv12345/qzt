import { useEffect, useState } from 'react'
import { NavBar, Card, Tag, ErrorBlock, SpinLoading, Button, Dialog, List, Toast } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import { deletePurchaseOrder, getPurchaseOrder, stockInPurchaseOrder } from '../../../services/psi'
import type { PsiPurchaseOrder } from '../../../types/psi'
import { PURCHASE_STATUS } from '../../../types/psi'
import PurchaseOrderSheet from '../../../components/PurchaseOrderSheet'

export default function PurchaseDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<PsiPurchaseOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [acting, setActing] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const reload = () => {
    if (!id) return
    setLoading(true)
    getPurchaseOrder(Number(id))
      .then((res) => setData(res))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }
  useEffect(reload, [id])

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><SpinLoading /></div>
  if (error || !data) return <ErrorBlock status="empty" />

  const s = PURCHASE_STATUS[data.status] || PURCHASE_STATUS[1]
  const items = (data as any).items || []
  const canExec = data.status === 1 // 待入库

  const onDelete = async () => {
    const ok = await Dialog.confirm({ content: '确定删除该采购单?' })
    if (!ok) return
    setActing(true)
    try {
      await deletePurchaseOrder(data.id)
      Toast.show({ icon: 'success', content: '已删除' })
      navigate(-1)
    } catch {
    } finally {
      setActing(false)
    }
  }

  const onStockIn = async () => {
    const ok = await Dialog.confirm({ content: '确认执行入库?' })
    if (!ok) return
    setActing(true)
    try {
      await stockInPurchaseOrder(data.id)
      Toast.show({ icon: 'success', content: '已入库' })
      reload()
    } catch {
    } finally {
      setActing(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>采购单详情</NavBar>
      <div style={{ padding: 12 }}>
        <Card title="基本信息" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontWeight: 600 }}>{data.order_no}</span>
            <Tag color={s.color} fill="outline">{s.text}</Tag>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
            <div>供应商: {data.supplier_name || '-'}</div>
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
            <span>采购总额</span>
            <span style={{ fontWeight: 600, color: '#ff4d4f' }}>¥{Number(data.total_amount || 0).toFixed(2)}</span>
          </div>
        </Card>

        <div style={{ display: 'flex', gap: 8 }}>
          {canExec && (
            <Button block color="primary" fill="outline" loading={acting} onClick={onStockIn}>执行入库</Button>
          )}
          <Button block color="primary" fill="outline" onClick={() => setShowEdit(true)}>编辑</Button>
          <Button block color="danger" fill="outline" loading={acting} onClick={onDelete}>删除</Button>
        </div>
      </div>

      <PurchaseOrderSheet visible={showEdit} order={data} onClose={() => setShowEdit(false)} onSubmitted={reload} />
    </div>
  )
}
