import { useCallback, useEffect, useRef, useState } from 'react'
import { FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, Tabs, Tag } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { listStockInOrders } from '../../../services/psi'
import type { PsiStockInOrder } from '../../../types/psi'
import { STOCK_IN_BIZ_TYPE, STOCK_IO_STATUS } from '../../../types/psi'
import { useInfiniteList } from '../../../hooks/useInfiniteList'
import StockIoSheet from '../../../components/StockIoSheet'

const TABS = [
  { key: '', label: '全部' },
  ...Object.entries(STOCK_IN_BIZ_TYPE).map(([key, label]) => ({ key, label })),
]

export default function StockInList() {
  const navigate = useNavigate()
  const [bizType, setBizType] = useState('')
  const [showNew, setShowNew] = useState(false)
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listStockInOrders({ ...params, biz_type: bizType || undefined }),
    [bizType],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<PsiStockInOrder>(fetcher, { page_size: 20 })

  // 切换筛选后重新加载(跳过首次挂载,挂载时 hook 已自动加载首页)
  const firstRef = useRef(true)
  useEffect(() => {
    if (firstRef.current) {
      firstRef.current = false
      return
    }
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizType])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>入库单</NavBar>
      <Tabs activeKey={bizType} onChange={setBizType}>
        {TABS.map((t) => (
          <Tabs.Tab key={t.key} title={t.label} />
        ))}
      </Tabs>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((o) => {
            const s = STOCK_IO_STATUS[o.status] || STOCK_IO_STATUS[2]
            return (
              <List.Item
                key={o.id}
                onClick={() => navigate(`/psi/stock-in/${o.id}`)}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{o.order_no} · {STOCK_IN_BIZ_TYPE[o.biz_type] || o.biz_type}</span>}
                extra={<span><div style={{ textAlign: 'right' }}>¥{Number(o.total_amount || 0).toFixed(2)}</div><Tag color={s.color} fill="outline">{s.text}</Tag></span>}
              >
                {o.warehouse_name || `仓库#${o.warehouse_id}`}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无入库单</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <StockIoSheet visible={showNew} mode="in" onClose={() => setShowNew(false)} onSubmitted={refresh} />
    </div>
  )
}
