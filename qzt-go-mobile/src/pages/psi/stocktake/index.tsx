import { useCallback, useState } from 'react'
import { Button, Dialog, FloatingBubble, InfiniteScroll, List, NavBar, Popup, PullToRefresh, Selector, Tag, TextArea } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createStocktakeOrder, listEnabledWarehouses, listStocktakeOrders } from '../../../services/psi'
import type { PsiStocktake, PsiWarehouse } from '../../../types/psi'
import { STOCKTAKE_STATUS } from '../../../types/psi'
import { useInfiniteList } from '../../../hooks/useInfiniteList'

/** 库存盘点(P15 移动端):列表 + 发起(冻结快照) */
export default function StocktakeList() {
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const [warehouses, setWarehouses] = useState<PsiWarehouse[]>([])
  const [warehouseId, setWarehouseId] = useState<number | undefined>(undefined)
  const [remark, setRemark] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listStocktakeOrders(params),
    [],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<PsiStocktake>(fetcher, { page_size: 20 })

  const openNew = () => {
    setWarehouseId(undefined)
    setRemark('')
    listEnabledWarehouses().then(setWarehouses).catch(() => setWarehouses([]))
    setShowNew(true)
  }

  const submit = async () => {
    if (!warehouseId) {
      Dialog.alert({ content: '请选择盘点仓库' })
      return
    }
    setSubmitting(true)
    try {
      await createStocktakeOrder({ warehouse_id: warehouseId, remark: remark.trim() || undefined })
      Dialog.clear()
      setShowNew(false)
      refresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar
        onBack={() => navigate(-1)}
        right={
          <span style={{ fontSize: 13 }} onClick={() => navigate('/psi/stocktransfer')}>
            调拨
          </span>
        }
      >
        库存盘点
      </NavBar>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((o) => {
            const s = STOCKTAKE_STATUS[o.status] || STOCKTAKE_STATUS[1]
            return (
              <List.Item
                key={o.id}
                onClick={() => navigate(`/psi/stocktake/${o.id}`)}
                description={
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {o.stocktake_no} · {o.take_date ? o.take_date.slice(0, 16) : ''}
                  </span>
                }
                extra={<Tag color={s.color} fill="outline">{s.text}</Tag>}
              >
                {o.warehouse_name || `仓库#${o.warehouse_id}`}
              </List.Item>
            )
          })}
          {list.length === 0 && (
            <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无盘点单</span></List.Item>
          )}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as React.CSSProperties} onClick={openNew}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      {/* 发起盘点弹窗 */}
      <Popup
        visible={showNew}
        onMaskClick={() => setShowNew(false)}
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, padding: 16 }}
        destroyOnClose
      >
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>发起盘点(创建即冻结账面快照)</div>
        <Selector
          options={warehouses.map((w) => ({ label: w.name, value: w.id }))}
          value={warehouseId ? [warehouseId] : []}
          onChange={(v) => setWarehouseId(v[0] as number | undefined)}
          columns={2}
        />
        <TextArea
          placeholder="盘点说明(可选)"
          rows={2}
          value={remark}
          onChange={setRemark}
          maxLength={200}
          style={{ marginTop: 12 }}
        />
        <Button
          block
          color="primary"
          size="large"
          style={{ marginTop: 12 }}
          loading={submitting}
          onClick={submit}
        >
          创建盘点单
        </Button>
      </Popup>
    </div>
  )
}
