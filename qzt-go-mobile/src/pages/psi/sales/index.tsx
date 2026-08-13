import { useCallback, useState } from 'react'
import { FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, Tag } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { listSalesOrders } from '../../../services/psi'
import type { PsiSalesOrder } from '../../../types/psi'
import { useInfiniteList } from '../../../hooks/useInfiniteList'
import SalesOrderSheet from '../../../components/SalesOrderSheet'

const SALES_STATUS: Record<number, { text: string; color: string }> = {
  1: { text: '待出库', color: 'warning' },
  2: { text: '已出库', color: 'success' },
  3: { text: '已关闭', color: 'default' },
}

export default function SalesList() {
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const fetcher = useCallback((params: { page: number; page_size: number }) => listSalesOrders(params), [])
  const { list, hasMore, loadMore, refresh } = useInfiniteList<PsiSalesOrder>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>销售管理</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((s) => {
            const st = SALES_STATUS[s.status] || SALES_STATUS[1]
            return (
              <List.Item
                key={s.id}
                onClick={() => navigate(`/psi/sales/${s.id}`)}
                description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{s.order_no} · {s.customer_name || '-'}</span>}
                extra={<span><div style={{ textAlign: 'right' }}>¥{Number(s.total_amount || 0).toFixed(2)}</div><Tag color={st.color} fill="outline">{st.text}</Tag></span>}
              >
                {s.customer_name || '销售单'}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无销售单</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <SalesOrderSheet visible={showNew} onClose={() => setShowNew(false)} onSubmitted={refresh} />
    </div>
  )
}
