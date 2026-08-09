import { useCallback } from 'react'
import { InfiniteScroll, List, NavBar, PullToRefresh, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listKbDocuments } from '../../services/oa'
import { useInfiniteList } from '../../hooks/useInfiniteList'

export default function KbDocumentList() {
  const navigate = useNavigate()
  const fetcher = useCallback((params: { page: number; page_size: number }) => listKbDocuments(params), [])
  const { list, hasMore, loadMore, refresh } = useInfiniteList<any>(fetcher, { page_size: 20 })

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>知识库</NavBar>
      <PullToRefresh onRefresh={refresh}>
        <List>
          {list.map((doc) => (
            <List.Item
              key={doc.id}
              onClick={() => navigate(`/kb/${doc.id}`)}
              description={
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {doc.updated_at?.slice(0, 16)}
                </span>
              }
              extra={<Tag color={doc.status === 'published' ? 'success' : 'default'} fill="outline">{doc.status === 'published' ? '已发布' : '草稿'}</Tag>}
            >
              {doc.title}
            </List.Item>
          ))}
          {list.length === 0 && <List.Item><span style={{ color: 'var(--text-tertiary)' }}>暂无文档</span></List.Item>}
        </List>
        <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
      </PullToRefresh>
    </div>
  )
}
