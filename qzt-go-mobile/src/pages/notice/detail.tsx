import { useEffect, useState } from 'react'
import { ErrorBlock, NavBar, SpinLoading, Tag } from 'antd-mobile'
import { useNavigate, useParams } from 'react-router-dom'
import { getNotice } from '../../services/notice'
import type { OaNotice } from '../../types/crm'

export default function NoticeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<OaNotice | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getNotice(Number(id))
      .then(setData)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div style={{ paddingTop: '40vh', textAlign: 'center' }}>
        <SpinLoading style={{ '--size': '40px' }} />
      </div>
    )
  }
  if (failed || !data) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
        <NavBar onBack={() => navigate(-1)}>公告详情</NavBar>
        <ErrorBlock status="default" title="加载失败" />
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>公告详情</NavBar>
      <div style={{ background: 'var(--bg-card)', margin: 8, padding: 16, borderRadius: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{data.title}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <Tag color={data.type === 1 ? 'primary' : 'warning'} fill="outline">
            {data.type === 1 ? '通知' : '公告'}
          </Tag>
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {data.publish_time?.slice(0, 16) || ''}
          </span>
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
          {data.content}
        </div>
      </div>
    </div>
  )
}
