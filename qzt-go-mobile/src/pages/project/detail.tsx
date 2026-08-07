import { useEffect, useState } from 'react'
import { Card, ErrorBlock, List, NavBar, SpinLoading, Tag, Selector } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import { getProject, updateTaskStatus } from '../../services/project'
import type { ProjectDetail } from '../../types/project'
import { PROJECT_STATUS, TASK_STATUS } from '../../types/project'

const TASK_COLUMNS = [
  { status: 1, label: '待办' },
  { status: 2, label: '进行中' },
  { status: 3, label: '已完成' },
]

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = () => {
    if (!id) return
    setLoading(true)
    getProject(Number(id)).then(setDetail).catch(() => setError(true)).finally(() => setLoading(false))
  }
  useEffect(load, [id])

  if (loading) return <div style={{ paddingTop: '40vh', textAlign: 'center' }}><SpinLoading style={{ '--size': '40px' }} /></div>
  if (error || !detail) return <ErrorBlock status="default" title="加载失败" />

  const { project: p, tasks } = detail
  const s = PROJECT_STATUS[p.status] || PROJECT_STATUS[1]

  const handleStatusChange = async (taskId: number, status: number) => {
    await updateTaskStatus(taskId, status)
    load()
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100%' }}>
      <NavBar onBack={() => navigate(-1)}>项目详情</NavBar>

      <Card title="基本信息" style={{ margin: 8 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</span>
          <Tag color={s.color} fill="outline">{s.text}</Tag>
        </div>
        <List>
          <List.Item extra={p.project_no}>编号</List.Item>
          {p.customer_name && <List.Item extra={p.customer_name}>客户</List.Item>}
          <List.Item extra={`${p.progress}%`}>进度</List.Item>
          <List.Item extra={p.start_date?.slice(0, 10) || '-'}>开始</List.Item>
          <List.Item extra={p.end_date?.slice(0, 10) || '-'}>截止</List.Item>
          {p.description && <List.Item extra={p.description}>描述</List.Item>}
        </List>
      </Card>

      <Card title={`任务(${tasks.length})`} style={{ margin: 8 }}>
        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 20 }}>暂无任务</div>
        ) : (
          tasks.map((t) => {
            const ts = TASK_STATUS[t.status] || TASK_STATUS[1]
            return (
              <List.Item
                key={t.id}
                description={
                  <div style={{ marginTop: 4 }}>
                    <Tag color={ts.color} fill="outline">{ts.text}</Tag>
                    {t.due_date && <span style={{ marginLeft: 8, fontSize: 12 }}>截止:{t.due_date.slice(0, 10)}</span>}
                  </div>
                }
                extra={
                  <Selector
                    options={TASK_COLUMNS.map((c) => ({ label: c.label, value: String(c.status) }))}
                    value={[String(t.status)]}
                    onChange={(v) => v[0] && handleStatusChange(t.id, Number(v[0]))}
                    style={{ '--color': 'var(--brand)' }}
                  />
                }
              >
                {t.title}
              </List.Item>
            )
          })
        )}
      </Card>
    </div>
  )
}
