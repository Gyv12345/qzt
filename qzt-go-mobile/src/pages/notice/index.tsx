import { useEffect, useState } from 'react'
import { ErrorBlock, List, NavBar, SpinLoading, Tabs, Tag } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { listNotices } from '../../services/notice'
import type { OaNotice } from '../../types/crm'

export default function NoticeList() {
  const navigate = useNavigate()
  const [type, setType] = useState(0)
  const [list, setList] = useState<OaNotice[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setLoading(true)
    setFailed(false)
    listNotices(type, 50)
      .then(setList)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [type])

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>公告通知</NavBar>
      <Tabs activeKey={String(type)} onChange={(k) => setType(Number(k))}>
        <Tabs.Tab title="全部" key="0" />
        <Tabs.Tab title="通知" key="1" />
        <Tabs.Tab title="公告" key="2" />
      </Tabs>

      {loading ? (
        <div style={{ paddingTop: 80, textAlign: 'center' }}>
          <SpinLoading style={{ '--size': '36px' }} />
        </div>
      ) : failed ? (
        <div style={{ paddingTop: 60 }}>
          <ErrorBlock status="empty" description="加载失败" />
        </div>
      ) : list.length === 0 ? (
        <div style={{ paddingTop: 60 }}>
          <ErrorBlock status="empty" title="暂无公告" />
        </div>
      ) : (
        <List style={{ marginTop: 1 }}>
          {list.map((n) => (
            <List.Item
              key={n.id}
              onClick={() => navigate(`/notice/${n.id}`)}
              description={
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                  {n.publish_time?.slice(0, 16) || n.created_at?.slice(0, 16)}
                </span>
              }
              extra={
                <Tag color={n.type === 1 ? 'primary' : 'warning'} fill="outline">
                  {n.type === 1 ? '通知' : '公告'}
                </Tag>
              }
            >
              {n.title}
            </List.Item>
          ))}
        </List>
      )}
    </div>
  )
}
