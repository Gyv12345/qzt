import { useCallback, useState } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listWarehouses } from '../../../services/psi'
import { PSI_STATUS_TEXT, type PsiWarehouse } from '../../../types/psi'
import { useInfiniteList } from '../../../hooks/useInfiniteList'

export default function WarehouseList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) =>
      listWarehouses({ ...params, keyword: keyword || undefined }),
    [keyword],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<PsiWarehouse>(fetcher, { page_size: 20 })
  const onSearch = (v: string) => {
    setKeyword(v)
    refresh()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>仓库</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索仓库名称/编码" onSearch={onSearch} onClear={() => onSearch('')} />
      </div>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((w) => (
            <List.Item
              key={w.id}
              description={
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {w.code}
                  {w.address ? ` · ${w.address}` : ''}
                  {w.phone ? ` · ${w.phone}` : ''}
                </span>
              }
              extra={
                <div style={{ display: 'flex', gap: 4, flexDirection: 'column', alignItems: 'flex-end' }}>
                  {w.is_default === 1 && <Tag color="primary" fill="outline">默认</Tag>}
                  <Tag color={w.status === 1 ? 'success' : 'default'} fill="outline">{PSI_STATUS_TEXT[w.status] || '-'}</Tag>
                </div>
              }
            >
              {w.name}
            </List.Item>
          ))}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无仓库</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
