import { useCallback } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, ProgressBar, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listProjects } from '../../services/project'
import type { ProjProject } from '../../types/project'
import { PROJECT_STATUS } from '../../types/project'
import { useInfiniteList } from '../../hooks/useInfiniteList'

export default function ProjectList() {
  const navigate = useNavigate()
  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listProjects(params),
    [],
  )
  const { list, hasMore, loadMore, refresh } = useInfiniteList<ProjProject>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>项目管理</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((p) => {
            const s = PROJECT_STATUS[p.status] || PROJECT_STATUS[1]
            return (
              <List.Item
                key={p.id}
                onClick={() => navigate(`/project/${p.id}`)}
                description={
                  <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                    <div>{p.project_no} {p.customer_name ? `· ${p.customer_name}` : ''}</div>
                    {p.progress > 0 && <ProgressBar percent={p.progress} style={{ marginTop: 4, '--track-width': '4px' }} />}
                  </div>
                }
                extra={<Tag color={s.color} fill="outline">{s.text}</Tag>}
              >
                {p.name}
              </List.Item>
            )
          })}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无项目</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
