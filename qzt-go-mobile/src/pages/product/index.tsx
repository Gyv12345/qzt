import { useCallback, useState } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, SearchBar } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listProducts } from '../../services/crm'
import type { CrmProduct } from '../../types/crm'
import { useInfiniteList } from '../../hooks/useInfiniteList'

export default function ProductList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listProducts({ ...params, keyword: keyword || undefined }),
    [keyword],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<CrmProduct>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>产品管理</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索产品名称" onSearch={() => refresh()} onClear={() => { setKeyword(''); refresh() }} />
      </div>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((p) => (
            <List.Item
              key={p.id}
              description={<span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{p.product_no} · {p.category || '-'} · {p.spec || '-'}</span>}
              extra={<span style={{ fontWeight: 600, color: 'var(--brand)' }}>{p.price ? `¥${p.price}` : ''}</span>}
            >
              {p.name}
            </List.Item>
          ))}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无产品</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
