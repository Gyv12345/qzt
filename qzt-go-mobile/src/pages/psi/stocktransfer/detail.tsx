import { useEffect, useState } from 'react'
import { Button, Card, Dialog, ErrorBlock, List, NavBar, SpinLoading, Tag } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import {
  cancelStockTransferOrder,
  deleteStockTransferOrder,
  executeStockTransferOrder,
  getStockTransferOrder,
} from '../../../services/psi'
import type { PsiStockTransferDetail } from '../../../types/psi'
import { STOCK_TRANSFER_STATUS } from '../../../types/psi'

/** 调拨详情(移动端 P15):明细 + 执行/作废/删除 */
export default function StockTransferDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<PsiStockTransferDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [acting, setActing] = useState(false)

  const load = () => {
    if (!id) return
    setLoading(true)
    getStockTransferOrder(Number(id))
      .then(setDetail)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  if (loading) {
    return (
      <div style={{ paddingTop: '40vh', textAlign: 'center' }}>
        <SpinLoading style={{ '--size': '40px' }} />
      </div>
    )
  }
  if (error || !detail) {
    return <ErrorBlock status="default" title="加载失败" description="调拨单不存在或无权限" />
  }

  const s = STOCK_TRANSFER_STATUS[detail.status] || STOCK_TRANSFER_STATUS[1]
  const inTransit = detail.status === 1

  const withConfirm = (title: string, content: string, run: () => Promise<void>) => {
    Dialog.confirm({
      title,
      content,
      onConfirm: async () => {
        setActing(true)
        try {
          await run()
        } finally {
          setActing(false)
        }
      },
    })
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%', paddingBottom: 24 }}>
      <NavBar onBack={() => navigate(-1)} right={<Tag color={s.color} fill="outline">{s.text}</Tag>}>
        {detail.transfer_no}
      </NavBar>

      <Card title="基本信息" style={{ margin: 8 }}>
        <List>
          <List.Item extra={detail.from_warehouse_name || `#${detail.from_warehouse_id}`}>调出仓库</List.Item>
          <List.Item extra={detail.to_warehouse_name || `#${detail.to_warehouse_id}`}>调入仓库</List.Item>
          <List.Item extra={detail.transfer_date ? detail.transfer_date.slice(0, 10) : '-'}>调拨日期</List.Item>
          {detail.remark && <List.Item extra={detail.remark}>说明</List.Item>}
        </List>
      </Card>

      <Card title="调拨明细" style={{ margin: 8 }}>
        <List>
          {(detail.items ?? []).map((it) => (
            <List.Item
              key={it.id}
              description={
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {it.sku_spec || `商品#${it.product_id}`}
                </span>
              }
              extra={<span>× {Number(it.quantity)}</span>}
            >
              {it.sku_spec ? it.sku_spec : `商品#${it.product_id}`}
            </List.Item>
          ))}
          {(detail.items ?? []).length === 0 && <List.Item>无明细</List.Item>}
        </List>
      </Card>

      {inTransit && (
        <div style={{ padding: 12, display: 'flex', gap: 8 }}>
          <Button
            block
            color="primary"
            loading={acting}
            onClick={() =>
              withConfirm('执行调拨?', '同一事务内完成调出仓出库+调入仓入库,失败整单回滚。', async () => {
                await executeStockTransferOrder(detail.id)
                Dialog.alert({ content: '调拨已执行,库存已变动' })
                load()
              })
            }
          >
            执行
          </Button>
          <Button
            block
            color="danger"
            fill="none"
            loading={acting}
            onClick={() =>
              withConfirm('作废调拨?', '作废不产生任何库存变动。', async () => {
                await cancelStockTransferOrder(detail.id)
                Dialog.alert({ content: '已作废' })
                load()
              })
            }
          >
            作废
          </Button>
        </div>
      )}
      {detail.status === 3 && (
        <div style={{ padding: 12 }}>
          <Button
            block
            color="danger"
            fill="outline"
            loading={acting}
            onClick={() =>
              withConfirm('删除调拨单?', '仅已作废的单可删除。', async () => {
                await deleteStockTransferOrder(detail.id)
                navigate(-1)
              })
            }
          >
            删除
          </Button>
        </div>
      )}
    </div>
  )
}
