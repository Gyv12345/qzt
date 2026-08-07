import { useCallback, useState } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listExpenses } from '../../services/oa'
import type { OaExpense } from '../../types/oa'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import { APPROVAL_STATUS, EXPENSE_TYPE } from '../../types/oa'

export default function ExpenseList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')

  const fetcher = useCallback(
    (params: { page: number; page_size: number }) =>
      listExpenses({ ...params, approval_status: keyword || undefined }),
    [keyword],
  )

  const { list, hasMore, loadMore, refresh } = useInfiniteList<OaExpense>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>报销管理</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索审批状态" onSearch={refresh} onClear={() => { setKeyword(''); refresh() }} />
      </div>

      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((e) => {
            const s = APPROVAL_STATUS[e.approval_status] || APPROVAL_STATUS.NONE
            return (
              <List.Item
                key={e.id}
                onClick={() => navigate(`/expense/${e.id}`)}
                description={
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    {e.expense_no} · {EXPENSE_TYPE[e.expense_type] || e.expense_type}
                  </span>
                }
                extra={
                  <span>
                    <div style={{ textAlign: 'right', fontWeight: 600, color: 'var(--brand)' }}>¥{Number(e.amount).toFixed(2)}</div>
                    <Tag color={s.color} fill="outline" style={{ marginTop: 4 }}>{s.text}</Tag>
                  </span>
                }
              >
                {e.title}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无报销</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
