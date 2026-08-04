import { useCallback, useState } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listCustomers } from '../../services/crm'
import type { CrmCustomer } from '../../types/crm'
import { useInfiniteList } from '../../hooks/useInfiniteList'

const LEVEL_TEXT: Record<string, string> = { A: '重要', B: '普通', C: '低价值' }
const LEVEL_COLOR: Record<string, string> = {
  A: 'danger',
  B: 'primary',
  C: 'default',
}

export default function CustomerList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')

  const fetcher = useCallback(
    (params: { page: number; page_size: number }) =>
      listCustomers({ ...params, keyword: keyword || undefined }),
    [keyword],
  )

  const { list, hasMore, loadMore, refresh } = useInfiniteList<CrmCustomer>(fetcher, {
    page_size: 20,
  })

  const onSearch = (val: string) => {
    setKeyword(val)
    refresh()
  }

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>我的客户</NavBar>
      <div style={{ padding: 8, background: '#fff' }}>
        <SearchBar placeholder="搜索客户名称" onSearch={onSearch} onClear={() => onSearch('')} />
      </div>

      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((c) => (
            <List.Item
              key={c.id}
              onClick={() => navigate(`/customer/${c.id}`)}
              description={
                <span style={{ fontSize: 12, color: '#999' }}>
                  {c.customer_no}
                  {c.industry ? ` · ${c.industry}` : ''}
                </span>
              }
              extra={
                c.level ? (
                  <Tag color={LEVEL_COLOR[c.level] || 'default'} fill="outline">
                    {LEVEL_TEXT[c.level] || c.level}
                  </Tag>
                ) : null
              }
            >
              {c.name}
            </List.Item>
          ))}
          {list.length === 0 && (
            <List.Item>
              <span style={{ color: '#999' }}>暂无客户</span>
            </List.Item>
          )}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
