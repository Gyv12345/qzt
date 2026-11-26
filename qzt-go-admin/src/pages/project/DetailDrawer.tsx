import { useCallback, useEffect, useState } from 'react'
import { App, Button, Card, Col, Descriptions, Drawer, Input, Popconfirm, Row, Select, Spin, Tabs, Tag } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import {
  createTask,
  deleteTask,
  getProject,
  updateTaskStatus,
} from '../../services/project'
import {
  PROJECT_STATUS,
  PRIORITY_MAP,
  TASK_STATUS,
  type ProjectDetail,
  type ProjTask,
} from '../../types/project'
import TaskEditModal from './TaskEditModal'
import GanttChart from './GanttChart'

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

/** 稳定空数组引用,避免甘特图 effect 因新数组身份反复重建 */
const EMPTY_TASKS: ProjTask[] = []

export default function ProjectDetailDrawer({ open, projectId, onOpenChange }: DetailDrawerProps) {
  const { message } = App.useApp()
  const [detail, setDetail] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  // 甘特图数据源(优先 gantt 端点,回退详情任务列表)
  const [ganttTasks, setGanttTasks] = useState<ProjTask[] | null>(null)
  // 任务编辑弹窗(task=null 时为新建)
  const [taskEditOpen, setTaskEditOpen] = useState(false)
  const [taskEditing, setTaskEditing] = useState<ProjTask | null>(null)

  const load = useCallback(() => {
    if (!projectId) return
    setLoading(true)
    // 甘特图与看板共用详情接口返回的全量任务列表(后端详情不分页)
    getProject(projectId)
      .then((d) => {
        setDetail(d)
        setGanttTasks(d.tasks || [])
      })
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => {
    if (open && projectId) load()
  }, [open, projectId, load])

  const tasks = ganttTasks || detail?.tasks || EMPTY_TASKS

  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !projectId) return
    await createTask({ project_id: projectId, title: newTaskTitle.trim() })
    message.success('任务已添加')
    setNewTaskTitle('')
    load()
  }

  const openTaskEdit = useCallback((t: ProjTask) => {
    setTaskEditing(t)
    setTaskEditOpen(true)
  }, [])

  const openTaskCreate = useCallback(() => {
    setTaskEditing(null)
    setTaskEditOpen(true)
  }, [])

  const handleStatusChange = async (taskId: number, status: number) => {
    await updateTaskStatus(taskId, status)
    load()
  }

  const handleDeleteTask = async (taskId: number) => {
    await deleteTask(taskId)
    message.success('已删除')
    load()
  }

  const p = detail?.project
  const statusInfo = p ? PROJECT_STATUS[p.status] || PROJECT_STATUS[1] : PROJECT_STATUS[1]
  const kanbanTasks = detail?.tasks || []

  const kanban = (
    <>
      {/* 添加任务 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Input
          placeholder="输入任务标题,回车快速添加到待办"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onPressEnter={handleAddTask}
          style={{ flex: 1 }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddTask}>快速添加</Button>
        <Button onClick={openTaskCreate}>新建任务</Button>
      </div>

      {/* 任务看板 */}
      <Row gutter={12}>
        {TASK_COLUMNS.map((col) => {
          const colTasks = kanbanTasks.filter((t) => t.status === col.status)
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
                        <DeleteOutlined style={{ color: 'var(--ant-color-text-tertiary)' }} />
                      </Popconfirm>,
                    ]}
                  >
                    <div
                      style={{ fontSize: 13, cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
                      onClick={() => openTaskEdit(task)}
                    >
                      {task.is_milestone === 1 && (
                        <span
                          style={{
                            flexShrink: 0,
                            width: 10,
                            height: 10,
                            background: '#faad14',
                            transform: 'rotate(45deg)',
                          }}
                        />
                      )}
                      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.title}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ant-color-text-tertiary)', marginTop: 4, display: 'flex', gap: 8 }}>
                      {task.start_date && <span>{task.start_date.slice(0, 10)} →</span>}
                      {task.due_date && <span>{task.due_date.slice(0, 10)}</span>}
                      {task.is_milestone === 1 && <Tag style={{ marginRight: 0 }} color="gold">里程碑</Tag>}
                    </div>
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
  )

  return (
    <Drawer
      title="项目详情"
      open={open}
      onClose={() => onOpenChange(false)}
      width={1020}
      destroyOnHidden
    >
      {loading && !detail ? (
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

          {/* 任务看板 / 甘特图 */}
          <Tabs
            defaultActiveKey="kanban"
            items={[
              { key: 'kanban', label: '任务看板', children: kanban },
              {
                key: 'gantt',
                label: '甘特图',
                children: (
                  <GanttChart tasks={tasks} loading={!ganttTasks && loading} onSelectTask={openTaskEdit} />
                ),
              },
            ]}
          />
        </>
      ) : (
        <div style={{ textAlign: 'center', paddingTop: 80, color: 'var(--ant-color-text-tertiary)' }}>无数据</div>
      )}

      {/* 任务新增/编辑弹窗(看板与甘特图共用) */}
      <TaskEditModal
        open={taskEditOpen}
        projectId={projectId || 0}
        task={taskEditing}
        onOpenChange={setTaskEditOpen}
        onSuccess={load}
      />
    </Drawer>
  )
}
