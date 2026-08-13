import { useEffect, useState } from 'react'
import { Card, ErrorBlock, List, NavBar, SpinLoading, Tag } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import { getStockOutOrder } from '../../../services/psi'
import { STOCK_OUT_BIZ_TYPE, STOCK_IO_STATUS, type PsiStockOutOrder, type PsiStockOutOrderDetail } from '../../../types/psi'

export default function StockOutDetail() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<PsiStockOutOrder | null>(null)
  const [items, setItems] = useState<PsiStockOutOrderDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(false)
    getStockOutOrder(Number(id))
      .then((res) => {
        setData(res)
        setItems((res as any).items || [])
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>出库单详情</NavBar>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><SpinLoading /></div>
      ) : error || !data ? (
        <ErrorBlock status="empty" description="加载失败" />
      ) : (
        <div style={{ padding: 12 }}>
          <Card title="基本信息">
            <div style={{ fontSize: 14, lineHeight: 2 }}>
              <div>单号:{data.order_no}</div>
              <div>类型:{STOCK_OUT_BIZ_TYPE[data.biz_type] || data.biz_type}</div>
              <div>仓库:{data.warehouse_name || `#${data.warehouse_id}`}</div>
              <div>状态:<Tag color={STOCK_IO_STATUS[data.status]?.color} fill="outline">{STOCK_IO_STATUS[data.status]?.text}</Tag></div>
              <div>日期:{data.order_date || '-'}</div>
              {data.remark && <div>备注:{data.remark}</div>}
            </div>
          </Card>
          <Card title={`明细(${items.length})`} style={{ marginTop: 12 }}>
            <List>
              {items.map((it, i) => (
                <List.Item key={i} description={`数量 ${Number(it.quantity || 0)}`}>
                  {(it as any).product_name || `商品#${it.product_id}`}
                </List.Item>
              ))}
              {items.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>无明细</span></List.Item>}
            </List>
          </Card>
        </div>
      )}
    </div>
  )
}
