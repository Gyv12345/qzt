import { useCallback } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listSalesReturns } from '../../../services/psi'
import { RETURN_STATUS, type PsiSalesReturn } from '../../../types/psi'
import { useInfiniteList } from '../../../hooks/useInfiniteList'

export default function SalesReturnList() {
  const navigate = useNavigate()
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listSalesReturns(params),
    [],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<PsiSalesReturn>(fetcher, {
    page_size: 20,
  })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>销售退货</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((r) => {
            const s = RETURN_STATUS[r.status] || RETURN_STATUS[1]
            return (
              <List.Item
                key={r.id}
                onClick={() => navigate(`/psi/sales-return/${r.id}`)}
                description={
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {r.return_no} · {r.customer_name || '-'}
                  </span>
                }
                extra={
                  <div style={{ textAlign: 'right' }}>
                    <div>¥{Number(r.total_amount || 0).toFixed(2)}</div>
                    <Tag color={s.color} fill="outline">{s.text}</Tag>
                  </div>
                }
              >
                销售退货单
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无退货单</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
