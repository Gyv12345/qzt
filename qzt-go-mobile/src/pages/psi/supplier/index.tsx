import { useCallback, useState } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listSuppliers } from '../../../services/psi'
import { PSI_STATUS_TEXT, type PsiSupplier } from '../../../types/psi'
import { useInfiniteList } from '../../../hooks/useInfiniteList'

export default function SupplierList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) =>
      listSuppliers({ ...params, keyword: keyword || undefined }),
    [keyword],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<PsiSupplier>(fetcher, { page_size: 20 })
  const onSearch = (v: string) => {
    setKeyword(v)
    refresh()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>供应商</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索供应商" onSearch={onSearch} onClear={() => onSearch('')} />
      </div>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((s) => (
            <List.Item
              key={s.id}
              description={
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {s.supplier_no}
                  {s.contact_person ? ` · ${s.contact_person}` : ''}
                  {s.phone ? ` · ${s.phone}` : ''}
                </span>
              }
              extra={<Tag color={s.status === 1 ? 'success' : 'default'} fill="outline">{PSI_STATUS_TEXT[s.status] || '-'}</Tag>}
            >
              {s.name}
            </List.Item>
          ))}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无供应商</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
