import { useCallback, useState } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, SearchBar, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listEmployees } from '../../../services/hrm'
import type { HrmEmployee } from '../../../types/hrm'
import { EMPLOYEE_STATUS } from '../../../types/hrm'
import { useInfiniteList } from '../../../hooks/useInfiniteList'

export default function EmployeeList() {
  const navigate = useNavigate()
  const [keyword, setKeyword] = useState('')
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listEmployees({ ...params, keyword: keyword || undefined }),
    [keyword],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<HrmEmployee>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>员工管理</NavBar>
      <div style={{ padding: 8, background: 'var(--bg-card)' }}>
        <SearchBar placeholder="搜索姓名/工号" onSearch={() => refresh()} onClear={() => { setKeyword(''); refresh() }} />
      </div>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((e) => (
            <List.Item
              key={e.id}
              onClick={() => navigate(`/hrm/employee/${e.id}`)}
              description={
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {e.emp_no} · {e.department_name || '-'} · {e.position_name || '-'}
                </span>
              }
              extra={<Tag color={e.status === 1 ? 'success' : e.status === 2 ? 'warning' : 'default'} fill="outline">{EMPLOYEE_STATUS[e.status] || '未知'}</Tag>}
            >
              {e.name} {e.phone ? `· ${e.phone}` : ''}
            </List.Item>
          ))}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无员工</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
