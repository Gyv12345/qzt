import { useCallback, useState } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, SearchBar } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listStock } from '../../../services/psi'
import type { PsiStock } from '../../../types/psi'
import { useInfiniteList } from '../../../hooks/useInfiniteList'

export default function StockList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listStock({ ...params, keyword: keyword || undefined }),
    [keyword],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<PsiStock>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>库存查询</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索产品名称/编码" onSearch={() => refresh()} onClear={() => { setKeyword(''); refresh() }} />
      </div>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((s) => (
            <List.Item
              key={s.id}
              description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{s.product_no} · {s.warehouse_name || '-'}</span>}
              extra={<span style={{ fontWeight: 600 }}>{s.quantity}{s.unit}</span>}
            >
              {s.product_name}
            </List.Item>
          ))}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无库存</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
