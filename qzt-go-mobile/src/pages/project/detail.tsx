import { useEffect, useState } from 'react'
import { Button, Card, Dialog, ErrorBlock, List, NavBar, SpinLoading, Tag, Selector, Toast } from 'antd-mobile'
import { useParams, useNavigate } from 'react-router-dom'
import { createTask, deleteProject, deleteTask, getProject, updateProject, updateTaskStatus } from '../../services/project'
import type { ProjectDetail } from '../../types/project'
import { PROJECT_STATUS, TASK_STATUS } from '../../types/project'
import FormSheet from '../../components/FormSheet'

const TASK_COLUMNS = [
  { status: 1, label: '待办' },
  { status: 2, label: '进行中' },
  { status: 3, label: '已完成' },
]

const STATUS_OPTIONS = [
  { label: '未开始', value: 1 },
  { label: '进行中', value: 2 },
  { label: '已完成', value: 3 },
  { label: '已搁置', value: 4 },
]

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [detail, setDetail] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showNewTask, setShowNewTask] = useState(false)
  const [acting, setActing] = useState(false)

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

  const onDeleteProject = async () => {
    const ok = await Dialog.confirm({ content: `确定删除项目「${p.name}」?` })
    if (!ok) return
    setActing(true)
    try {
      await deleteProject(p.id)
      navigate(-1)
    } finally {
      setActing(false)
    }
  }

  const onDeleteTask = async (taskId: number) => {
    const ok = await Dialog.confirm({ content: '确定删除该任务?' })
    if (!ok) return
    try {
      await deleteTask(taskId)
      Toast.show({ icon: 'success', content: '已删除' })
      load()
    } catch {
    }
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

      <div style={{ margin: 8, display: 'flex', gap: 8 }}>
        <Button block color="primary" fill="outline" onClick={() => setShowEdit(true)}>编辑</Button>
        <Button block color="danger" fill="outline" onClick={onDeleteProject} loading={acting}>删除</Button>
      </div>

      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>任务({tasks.length})</span>
            <Button size="small" color="primary" onClick={() => setShowNewTask(true)}>新增</Button>
          </div>
        }
        style={{ margin: 8 }}
      >
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
                    <a style={{ marginLeft: 12, color: '#ff4d4f', fontSize: 12 }} onClick={() => onDeleteTask(t.id)}>删除</a>
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

      <FormSheet
        visible={showEdit}
        title="编辑项目"
        fields={[
          { name: 'name', label: '项目名称', type: 'text', required: true },
          { name: 'status', label: '状态', type: 'select', options: STATUS_OPTIONS },
          { name: 'start_date', label: '开始日期', type: 'date', datePrecision: 'date' },
          { name: 'end_date', label: '截止日期', type: 'date', datePrecision: 'date' },
          { name: 'description', label: '描述', type: 'textarea' },
        ]}
        initialValues={{ name: p.name, status: p.status, start_date: p.start_date?.slice(0, 10), end_date: p.end_date?.slice(0, 10), description: p.description }}
        onClose={() => setShowEdit(false)}
        onSubmit={async (v) => {
          await updateProject(p.id, {
            name: v.name,
            status: v.status ? Number(v.status) : undefined,
            start_date: v.start_date || undefined,
            end_date: v.end_date || undefined,
            description: v.description || undefined,
          })
          load()
        }}
      />

      <FormSheet
        visible={showNewTask}
        title="新增任务"
        fields={[
          { name: 'title', label: '任务标题', type: 'text', required: true },
          { name: 'due_date', label: '截止日期', type: 'date', datePrecision: 'date' },
          { name: 'description', label: '描述', type: 'textarea' },
        ]}
        onClose={() => setShowNewTask(false)}
        onSubmit={async (v) => {
          await createTask({
            project_id: p.id,
            title: v.title,
            due_date: v.due_date || undefined,
            description: v.description || undefined,
          })
          setShowNewTask(false)
          load()
        }}
      />
    </div>
  )
}
