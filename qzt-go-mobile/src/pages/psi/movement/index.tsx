import { useCallback, useEffect, useState } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listEnabledWarehouses, listStockMovements } from '../../../services/psi'
import {
  BIZ_TYPE_COLOR,
  BIZ_TYPE_TEXT,
  type PsiStockMovement,
} from '../../../types/psi'
import { useInfiniteList } from '../../../hooks/useInfiniteList'

export default function StockMovementList() {
  const navigate = useNavigate()
  const [whMap, setWhMap] = useState<Record<number, string>>({})

  useEffect(() => {
    listEnabledWarehouses()
      .then((ws) => {
        const m: Record<number, string> = {}
        for (const w of ws || []) m[w.id] = w.name
        setWhMap(m)
      })
      .catch(() => {})
  }, [])

  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listStockMovements(params),
    [],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<PsiStockMovement>(fetcher, {
    page_size: 20,
  })

  const whName = (m: PsiStockMovement) => m.warehouse_name || whMap[m.warehouse_id] || `#${m.warehouse_id}`

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>库存流水</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((m) => {
            const isIn = Number(m.in_qty || 0) > 0
            const qty = isIn ? m.in_qty : m.out_qty
            return (
              <List.Item
                key={m.id}
                description={
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {m.created_at?.slice(0, 16)} · {whName(m)}
                    {m.biz_order_no ? ` · ${m.biz_order_no}` : ''}
                  </span>
                }
                extra={
                  <span style={{ fontWeight: 600, color: isIn ? '#52c41a' : '#f5222d' }}>
                    {isIn ? '+' : '-'}
                    {Number(qty || 0)}
                  </span>
                }
              >
                <Tag color={BIZ_TYPE_COLOR[m.biz_type] || 'default'} fill="outline" style={{ marginRight: 6 }}>
                  {BIZ_TYPE_TEXT[m.biz_type] || m.biz_type}
                </Tag>
                {m.product_name || `商品#${m.product_id}`}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无流水记录</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
