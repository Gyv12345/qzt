import { useCallback, useState } from 'react'
import { FloatingBubble, InfiniteScroll, List, NavBar, PullToRefresh, ProgressBar, Tag } from 'antd-mobile'
import { AddOutline } from 'antd-mobile-icons'
import { useNavigate } from 'react-router-dom'
import { createProject, listProjects } from '../../services/project'
import type { ProjProject } from '../../types/project'
import { PROJECT_STATUS } from '../../types/project'
import { useInfiniteList } from '../../hooks/useInfiniteList'
import FormSheet from '../../components/FormSheet'

const STATUS_OPTIONS = [
  { label: '未开始', value: 1 },
  { label: '进行中', value: 2 },
  { label: '已完成', value: 3 },
  { label: '已搁置', value: 4 },
]

export default function ProjectList() {
  const navigate = useNavigate()
  const [showNew, setShowNew] = useState(false)
  const fetcher = useCallback((params: { page: number; page_size: number }) => listProjects(params), [])
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

      <FloatingBubble style={{ '--size': '48px' } as any} onClick={() => setShowNew(true)}>
        <AddOutline fontSize={24} />
      </FloatingBubble>

      <FormSheet
        visible={showNew}
        title="新建项目"
        fields={[
          { name: 'name', label: '项目名称', type: 'text', required: true },
          { name: 'status', label: '状态', type: 'select', options: STATUS_OPTIONS },
          { name: 'start_date', label: '开始日期', type: 'date', datePrecision: 'date' },
          { name: 'end_date', label: '截止日期', type: 'date', datePrecision: 'date' },
          { name: 'description', label: '描述', type: 'textarea' },
        ]}
        onClose={() => setShowNew(false)}
        onSubmit={async (v) => {
          await createProject({
            name: v.name,
            status: v.status ? Number(v.status) : undefined,
            start_date: v.start_date || undefined,
            end_date: v.end_date || undefined,
            description: v.description || undefined,
          })
          refresh()
        }}
      />
    </div>
  )
}
