import { useCallback, useState } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, Tabs } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listInitiated, listProcessed, listTodos } from '../../services/approval'
import type { ApprovalInstance } from '../../types/approval'
import { useInfiniteList } from '../../hooks/useInfiniteList'

type TabKey = 'todos' | 'processed' | 'initiated'

const STATUS_TEXT: Record<string, string> = {
  PENDING: '待处理',
  APPROVING: '审批中',
  APPROVED: '已通过',
  REJECTED: '已驳回',
  REVOKED: '已撤回',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'warning',
  APPROVING: 'primary',
  APPROVED: 'success',
  REJECTED: 'danger',
  REVOKED: 'default',
}

export default function ApprovalList() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<TabKey>('todos')

  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => {
      if (tab === 'todos') return listTodos(params)
      if (tab === 'processed') return listProcessed(params)
      return listInitiated(params)
    },
    [tab],
  )

  const { list, hasMore, loadMore, refresh } = useInfiniteList<ApprovalInstance>(fetcher, {
    page_size: 20,
  }, [tab])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>审批中心</NavBar>
      <Tabs activeKey={tab} onChange={(k) => setTab(k as TabKey)}>
        <Tabs.Tab title="待办" key="todos" />
        <Tabs.Tab title="已办" key="processed" />
        <Tabs.Tab title="我发起" key="initiated" />
      </Tabs>

      <PullToRefresh onRefresh={refresh}>
        <List style={{ marginTop: 1 }}>
          {list.map((it) => (
            <List.Item
              key={it.id}
              onClick={() => navigate(`/approval/${it.id}`)}
              description={
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {it.type} · 提交 {it.submit_time}
                </span>
              }
              extra={
                <span style={{ color: STATUS_COLOR[it.approval_status] || '#999', fontSize: 13 }}>
                  {STATUS_TEXT[it.approval_status] || it.approval_status}
                </span>
              }
            >
              {`审批单 #${it.resource_id}`}
            </List.Item>
          ))}
          {list.length === 0 && (
            <List.Item>
              <span style={{ color: 'var(--text-tertiary)' }}>暂无数据</span>
            </List.Item>
          )}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
