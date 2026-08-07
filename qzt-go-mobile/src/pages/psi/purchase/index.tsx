import { useCallback } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listPurchaseOrders } from '../../../services/psi'
import type { PsiPurchaseOrder } from '../../../types/psi'
import { PURCHASE_STATUS } from '../../../types/psi'
import { useInfiniteList } from '../../../hooks/useInfiniteList'

export default function PurchaseList() {
  const navigate = useNavigate()
  const fetcher = useCallback((params: { page: number; page_size: number }) => listPurchaseOrders(params), [])
  const { list, hasMore, loadMore, refresh } = useInfiniteList<PsiPurchaseOrder>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>采购管理</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((p) => {
            const s = PURCHASE_STATUS[p.status] || PURCHASE_STATUS[1]
            return (
              <List.Item
                key={p.id}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{p.order_no} · {p.supplier_name || '-'}</span>}
                extra={<span><div style={{ textAlign: 'right' }}>¥{Number(p.total_amount || 0).toFixed(2)}</div><Tag color={s.color} fill="outline">{s.text}</Tag></span>}
              >
                {p.supplier_name || '采购单'}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无采购单</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
