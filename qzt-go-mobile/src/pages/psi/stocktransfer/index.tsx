import { useCallback, useState } from 'react'
import { Button, Dialog, FloatingBubble, InfiniteScroll, Input, List, NavBar, Popup, PullToRefresh, Selector, Tag, TextArea } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import {
  createStockTransferOrder,
  listEnabledWarehouses,
  listStock,
  listStockTransferOrders,
} from '../../../services/psi'
import type { PsiStock, PsiStockTransfer, PsiWarehouse } from '../../../types/psi'
import { STOCK_TRANSFER_STATUS } from '../../../types/psi'
import { useInfiniteList } from '../../../hooks/useInfiniteList'

interface DraftItem {
  product_id: number
  sku_id: number
  label: string
  quantity: string
}

/** 库存调拨(P15 移动端):列表 + 创建(选调出/调入仓,从调出仓库存选商品) */
export default function StockTransferList() {
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const [warehouses, setWarehouses] = useState<PsiWarehouse[]>([])
  const [fromWh, setFromWh] = useState<number | undefined>(undefined)
  const [toWh, setToWh] = useState<number | undefined>(undefined)
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 从调出仓库存选商品
  const [showPick, setShowPick] = useState(false)
  const [stockRows, setStockRows] = useState<PsiStock[]>([])
  const [pickLoading, setPickLoading] = useState(false)
  const [items, setItems] = useState<DraftItem[]>([])

  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listStockTransferOrders(params),
    [],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<PsiStockTransfer>(fetcher, { page_size: 20 })

  const openNew = () => {
    setFromWh(undefined)
    setToWh(undefined)
    setRemark('')
    setItems([])
    listEnabledWarehouses().then(setWarehouses).catch(() => setWarehouses([]))
    setShowNew(true)
  }

  const openPick = () => {
    if (!fromWh) {
      Dialog.alert({ content: '请先选择调出仓库' })
      return
    }
    setPickLoading(true)
    listStock({ warehouse_id: fromWh, page: 1, page_size: 50 })
      .then((res) => setStockRows(res.list ?? []))
      .catch(() => setStockRows([]))
      .finally(() => setPickLoading(false))
    setShowPick(true)
  }

  const pickRow = (r: PsiStock) => {
    const key = `${r.product_id}-${r.sku_id}`
    if (items.some((i) => `${i.product_id}-${i.sku_id}` === key)) return
    setItems((prev) => [
      ...prev,
      {
        product_id: r.product_id,
        sku_id: r.sku_id,
        label: `${r.product_name}${r.sku_spec ? `(${r.sku_spec})` : ''} · 结余${Number(r.quantity)}`,
        quantity: '1',
      },
    ])
  }

  const submit = async () => {
    if (!fromWh || !toWh) {
      Dialog.alert({ content: '请选择调出/调入仓库' })
      return
    }
    if (fromWh === toWh) {
      Dialog.alert({ content: '调出与调入仓库不能相同' })
      return
    }
    if (items.length === 0) {
      Dialog.alert({ content: '请从调出仓库存选择商品' })
      return
    }
    setSubmitting(true)
    try {
      await createStockTransferOrder({
        from_warehouse_id: fromWh,
        to_warehouse_id: toWh,
        remark: remark.trim() || undefined,
        items: items.map((i) => ({
          product_id: i.product_id,
          sku_id: i.sku_id || undefined,
          quantity: Number(i.quantity),
        })),
      })
      Dialog.clear()
      setShowNew(false)
      refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>库存调拨</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((o) => {
            const s = STOCK_TRANSFER_STATUS[o.status] || STOCK_TRANSFER_STATUS[1]
            return (
              <List.Item
                key={o.id}
                onClick={() => navigate(`/psi/stocktransfer/${o.id}`)}
                description={
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {o.transfer_no} · {o.from_warehouse_name ?? `#${o.from_warehouse_id}`} → {o.to_warehouse_name ?? `#${o.to_warehouse_id}`}
                  </span>
                }
                extra={<Tag color={s.color} fill="outline">{s.text}</Tag>}
              >
                {o.transfer_date ? o.transfer_date.slice(0, 10) : ''}
              </List.Item>
            )
          })}
          {list.length === 0 && (
            <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无调拨单</span></List.Item>
          )}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as React.CSSProperties} onClick={openNew}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      {/* 创建调拨弹窗 */}
      <Popup
        visible={showNew}
        onMaskClick={() => setShowNew(false)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16, maxHeight: '80vh', overflow: 'auto' }}
        destroyOnClose
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>新增调拨(创建后在途,执行才动库存)</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 4 }}>调出仓库</div>
        <Selector
          options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
          value={fromWh ? [fromWh] : []}
          onChange={(v) => {
            setFromWh(v[0] as number | undefined)
            setItems([])
          }}
          columns={2}
        />
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)', margin: '10px 0 4px' }}>调入仓库</div>
        <Selector
          options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
          value={toWh ? [toWh] : []}
          onChange={(v) => setToWh(v[0] as number | undefined)}
          columns={2}
        />
        <Button block size="small" color="primary" fill="outline" style={{ marginTop: 12 }} onClick={openPick}>
          从调出仓库存选商品
        </Button>
        {items.map((it, idx) => (
          <List key={`${it.product_id}-${it.sku_id}`} style={{ '--border-inner': 'none' }}>
            <List.Item
              description={it.label}
              extra={
                <Input
                  style={{ width: 72, textAlign: 'right' }}
                  type="number"
                  value={it.quantity}
                  onChange={(v) =>
                    setItems((prev) => prev.map((p, i) => (i === idx ? { ...p, quantity: v } : p)))
                  }
                />
              }
            >
              数量
            </List.Item>
          </List>
        ))}
        <TextArea
          placeholder="调拨说明(可选)"
          rows={2}
          value={remark}
          onChange={setRemark}
          maxLength={200}
          style={{ marginTop: 12 }}
        />
        <Button block color="primary" size="large" style={{ marginTop: 12 }} loading={submitting} onClick={submit}>
          创建调拨单
        </Button>
      </Popup>

      {/* 从调出仓库存选商品弹层 */}
      <Popup
        visible={showPick}
        onMaskClick={() => setShowPick(false)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16, maxHeight: '70vh', overflow: 'auto' }}
        destroyOnClose
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>选择调出仓商品(点选加入明细)</div>
        {pickLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>加载中…</div>
        ) : stockRows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-tertiary)' }}>该仓无库存结余</div>
        ) : (
          <List>
            {stockRows.map((r) => {
              const key = `${r.product_id}-${r.sku_id}`
              const picked = items.some((i) => `${i.product_id}-${i.sku_id}` === key)
              return (
                <List.Item
                  key={key}
                  clickable
                  onClick={() => pickRow(r)}
                  description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>结余 {Number(r.quantity)}</span>}
                  extra={picked ? <span style={{ color: 'var(--adm-color-primary)' }}>已选</span> : null}
                >
                  {r.product_name}
                  {r.sku_spec ? `(${r.sku_spec})` : ''}
                </List.Item>
              )
            })}
          </List>
        )}
      </Popup>
    </div>
  )
}
