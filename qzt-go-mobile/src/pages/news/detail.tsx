import { useEffect, useState } from 'react'
import { ErrorBlock, NavBar, SpinLoading, Tag } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import { getPublicArticle } from '../../services/cms'
import type { CmsArticle } from '../../types/cms'

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [article, setArticle] = useState<CmsArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getPublicArticle(Number(id))
      .then(setArticle)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ paddingTop: '40vh', textAlign: 'center' }}>
        <SpinLoading style={{ '--size': '40px' }} />
      </div>
    )
  }
  if (error || !article) {
    return <ErrorBlock status="default" title="加载失败" description="文章获取失败" />
  }

  return (
    <div style={{ background: '#fff', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>资讯详情</NavBar>
      <div style={{ padding: '16px' }}>
        <h1 style={{ fontSize: 20, lineHeight: 1.4, marginBottom: 8 }}>{article.title}</h1>
        <div style={{ fontSize: 12, color: '#999', marginBottom: 16 }}>
          {article.author_name ? `${article.author_name} · ` : ''}
          {dayjs(article.created_at).format('YYYY-MM-DD HH:mm')}
          {article.view_count ? ` · 阅读 ${article.view_count}` : ''}
        </div>

        {article.is_hot === 1 && (
          <Tag color="danger" style={{ marginBottom: 12 }}>
            热门
          </Tag>
        )}

        {article.cover_url && (
          <img
            src={article.cover_url}
            alt=""
            style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 6, marginBottom: 16 }}
          />
        )}

        {/* 正文:后端为富文本/HTML,这里直接渲染 */}
        <div
          className="news-content"
          style={{ fontSize: 15, lineHeight: 1.8, color: '#333' }}
          dangerouslySetInnerHTML={{ __html: article.content }}
        />
      </div>
    </div>
  )
}
