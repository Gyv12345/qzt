import { useCallback } from 'react'
import { Card, ErrorBlock, InfiniteScroll, NavBar, PullToRefresh, SpinLoading } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { listPublicArticles } from '../../services/cms'
import type { CmsArticle } from '../../types/cms'
import { useInfiniteList } from '../../hooks/useInfiniteList'

export default function NewsList() {
  const navigate = useNavigate()

  const fetcher = useCallback(
    (params: { page: number; page_size: number }) => listPublicArticles(params),
    [],
  )

  const { list, hasMore, loadMore, refresh, loading } = useInfiniteList<CmsArticle>(fetcher, {
    page_size: 10,
  })

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>资讯公告</NavBar>

      {loading && list.length === 0 ? (
        <div style={{ paddingTop: '30vh', textAlign: 'center' }}>
          <SpinLoading style={{ '--size': '36px' }} />
        </div>
      ) : list.length === 0 ? (
        <ErrorBlock status="empty" title="暂无资讯" />
      ) : (
        <PullToRefresh onRefresh={refresh}>
          <div style={{ padding: 8 }}>
            {list.map((a) => (
              <Card
                key={a.id}
                style={{ marginBottom: 8 }}
                onClick={() => navigate(`/news/${a.id}`)}
                title={
                  <span style={{ fontSize: 15, fontWeight: 600 }}>
                    {a.is_top === 1 && '📌 '}
                    {a.title}
                  </span>
                }
              >
                {a.cover_url && (
                  <img
                    src={a.cover_url}
                    alt=""
                    style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }}
                  />
                )}
                {a.summary && (
                  <div style={{ fontSize: 13, color: '#666', marginBottom: 6 }}>{a.summary}</div>
                )}
                <div style={{ fontSize: 12, color: '#999' }}>
                  {a.author_name ? `${a.author_name} · ` : ''}
                  {dayjs(a.created_at).format('YYYY-MM-DD')}
                </div>
              </Card>
            ))}
          </div>
          <InfiniteScroll loadMore={loadMore} hasMore={hasMore} />
        </PullToRefresh>
      )}
    </div>
  )
}
