import { useEffect, useState, useCallback } from 'react'
import { App, Button, Card, Col, Descriptions, Drawer, Popconfirm, Row, Select, Spin, Tag, Input } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { createTask, deleteTask, getProject, updateTask, updateTaskStatus } from '../../services/project'
import { PROJECT_STATUS, PRIORITY_MAP, TASK_STATUS, type ProjectDetail } from '../../types/project'

interface DetailDrawerProps {
  open: boolean
  projectId: number | null
  onOpenChange: (open: boolean) => void
}

const TASK_COLUMNS = [
  { status: 1, title: '待办', color: '#d9d9d9' },
  { status: 2, title: '进行中', color: '#1677ff' },
  { status: 3, title: '已完成', color: '#52c41a' },
]

export default function ProjectDetailDrawer({ open, projectId, onOpenChange }: DetailDrawerProps) {
  const { message } = App.useApp()
  const [detail, setDetail] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const load = useCallback(() => {
    if (!projectId) return
    setLoading(true)
    getProject(projectId).then(setDetail).finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    if (open && projectId) load()
  }, [open, projectId, load])

  const p = detail?.project
  const tasks = detail?.tasks || []

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !projectId) return
    await createTask({ project_id: projectId, title: newTaskTitle.trim() })
    message.success('任务已添加')
    setNewTaskTitle('')
    load()
  }

  const handleStatusChange = async (taskId: number, status: number) => {
    await updateTaskStatus(taskId, status)
    load()
  }

  const handleDeleteTask = async (taskId: number) => {
    await deleteTask(taskId)
    message.success('已删除')
    load()
  }

  const handleSaveEdit = async (taskId: number) => {
    if (!editTitle.trim()) return
    await updateTask(taskId, { title: editTitle.trim() })
    setEditingTaskId(null)
    load()
  }

  const statusInfo = p ? PROJECT_STATUS[p.status] || PROJECT_STATUS[1] : PROJECT_STATUS[1]

  return (
    <Drawer
      title="项目详情"
      open={open}
      onClose={() => onOpenChange(false)}
      width={960}
      destroyOnHidden
    >
      {loading ? (
        <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin size="large" /></div>
      ) : detail && p ? (
        <>
          {/* 项目信息 */}
          <Descriptions column={3} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="编号">{p.project_no}</Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={statusInfo.color}>{statusInfo.text}</Tag></Descriptions.Item>
            <Descriptions.Item label="优先级"><Tag color={(PRIORITY_MAP[p.priority] || PRIORITY_MAP[2]).color}>{(PRIORITY_MAP[p.priority] || PRIORITY_MAP[2]).text}</Tag></Descriptions.Item>
            <Descriptions.Item label="项目名称" span={3}>{p.name}</Descriptions.Item>
            {p.customer_name && <Descriptions.Item label="客户">{p.customer_name}</Descriptions.Item>}
            <Descriptions.Item label="开始">{p.start_date?.slice(0, 10) || '-'}</Descriptions.Item>
            <Descriptions.Item label="截止">{p.end_date?.slice(0, 10) || '-'}</Descriptions.Item>
            {p.description && <Descriptions.Item label="描述" span={3}>{p.description}</Descriptions.Item>}
          </Descriptions>

          {/* 添加任务 */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <Input
              placeholder="输入任务标题,回车添加到待办"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onPressEnter={handleAddTask}
              style={{ flex: 1 }}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTask}>添加</Button>
          </div>

          {/* 任务看板 */}
          <Row gutter={12}>
            {TASK_COLUMNS.map((col) => {
              const colTasks = tasks.filter((t) => t.status === col.status)
              return (
                <Col span={8} key={col.status}>
                  <Card
                    size="small"
                    title={<span style={{ color: col.color }}>● {col.title} ({colTasks.length})</span>}
                    bodyStyle={{ padding: 8, minHeight: 200 }}
                  >
                    {colTasks.map((task) => (
                      <Card
                        key={task.id}
                        size="small"
                        style={{ marginBottom: 8 }}
                        bodyStyle={{ padding: '8px 12px' }}
                        actions={[
                          <Select
                            key="status"
                            size="small"
                            variant="borderless"
                            value={task.status}
                            onChange={(v) => handleStatusChange(task.id, v)}
                            style={{ width: '100%' }}
                            options={Object.entries(TASK_STATUS).map(([k, v]) => ({ label: v.text, value: Number(k) }))}
                          />,
                          <Popconfirm key="del" title="删除任务?" onConfirm={() => handleDeleteTask(task.id)}>
                            <DeleteOutlined style={{ color: '#999' }} />
                          </Popconfirm>,
                        ]}
                      >
                        {editingTaskId === task.id ? (
                          <Input
                            size="small"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onPressEnter={() => handleSaveEdit(task.id)}
                            onBlur={() => handleSaveEdit(task.id)}
                            autoFocus
                          />
                        ) : (
                          <div
                            style={{ fontSize: 13, cursor: 'pointer', fontWeight: 500 }}
                            onClick={() => { setEditingTaskId(task.id); setEditTitle(task.title) }}
                          >
                            {task.title}
                          </div>
                        )}
                        {task.due_date && (
                          <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                            截止: {task.due_date.slice(0, 10)}
                          </div>
                        )}
                      </Card>
                    ))}
                    {colTasks.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#ccc', padding: 20 }}>暂无</div>
                    )}
                  </Card>
                </Col>
              )
            })}
          </Row>
        </>
      ) : (
        <div style={{ textAlign: 'center', paddingTop: 80, color: '#999' }}>无数据</div>
      )}
    </Drawer>
  )
}
