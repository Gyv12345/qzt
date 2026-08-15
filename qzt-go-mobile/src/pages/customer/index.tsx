import { useCallback, useState } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag, FloatingBubble } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { listCustomers } from '../../services/crm'
import type { CrmCustomer } from '../../types/crm'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import CustomerFormSheet from '../../components/CustomerFormSheet'

const LEVEL_TEXT: Record<string, string> = { A: '重要', B: '普通', C: '低价值' }
const LEVEL_COLOR: Record<string, string> = {
  A: 'danger',
  B: 'primary',
  C: 'default',
}

export default function CustomerList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const [showNew, setShowNew] = useState(false)

  const fetcher = useCallback(
    (params: { page: number; page_size: number }) =>
      listCustomers({ ...params, keyword: keyword || undefined }),
    [keyword],
  )

  const { list, hasMore, loadMore, refresh } = useInfiniteList<CrmCustomer>(fetcher, {
    page_size: 20,
  }, [keyword])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)} right={null}>我的客户</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索客户名称" onSearch={setKeyword} onClear={() => setKeyword('')} />
      </div>

      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((c) => (
            <List.Item
              key={c.id}
              onClick={() => navigate(`/customer/${c.id}`)}
              description={
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
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
              <span style={{ color: 'var(--text-tertiary)' }}>暂无客户</span>
            </List.Item>
          )}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>

      <FloatingBubble
        style={{ '--size': '48px' } as any}
        onClick={() => setShowNew(true)}
      >
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <CustomerFormSheet
        visible={showNew}
        onClose={() => setShowNew(false)}
        onSubmitted={refresh}
      />
    </div>
  )
}
