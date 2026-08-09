import { useEffect, useState } from 'react'
import { NavBar, ErrorBlock, SpinLoading, Card } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import { getKbDocument } from '../../services/oa'

export default function KbDocumentDetail() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [doc, setDoc] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getKbDocument(Number(id))
      .then((res) => setDoc(res))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={{ textAlign: 'center', padding: 40 }}><SpinLoading /></div>
  if (error || !doc) return <ErrorBlock status="empty" />

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>{doc.title}</NavBar>
      <div style={{ padding: 12 }}>
        <Card>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 12 }}>
            更新时间: {doc.updated_at?.slice(0, 16)} · 浏览: {doc.view_count || 0}
          </div>
          <div
            className="markdown-body"
            style={{ fontSize: 15, lineHeight: 1.8 }}
            dangerouslySetInnerHTML={{ __html: doc.content || '<p style="color:#999">暂无内容</p>' }}
          />
        </Card>
      </div>
    </div>
  )
}
