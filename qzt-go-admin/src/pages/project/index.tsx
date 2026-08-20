import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Progress, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../components/Auth'
import UserSelect from '../../components/UserSelect'
import { deleteProject, listProjects, updateProject } from '../../services/project'
import { PROJECT_STATUS, PRIORITY_MAP, type ProjProject } from '../../types/project'
import ProjectEditModal from './EditModal'
import ProjectDetailDrawer from './DetailDrawer'
import { pageIndexColumn } from '../../components/IndexTag'

export default function ProjectPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const openDetail = (id: number) => {
    setDetailId(id)
    setDetailOpen(true)
  }

  const handleDelete = async (id: number) => {
    await deleteProject(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const handleStatusChange = async (id: number, status: number) => {
    await updateProject(id, { status })
    message.success('状态已更新')
    actionRef.current?.reload()
  }

  const columns: ProColumns<ProjProject>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    {
      title: '项目编号',
      dataIndex: 'project_no',
      width: 140,
      render: (_, r) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openDetail(r.id)}>
          {r.project_no}
        </Button>
      ),
    },
    { title: '项目名称', dataIndex: 'name', width: 200, ellipsis: true },
    { title: '客户', dataIndex: 'customer_name', width: 140, ellipsis: true, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(PROJECT_STATUS).map(([k, v]) => [k, { text: v.text }]),
      ),
      render: (_, r) => {
        const s = PROJECT_STATUS[r.status] || PROJECT_STATUS[1]
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 80,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(PRIORITY_MAP).map(([k, v]) => [k, { text: v.text }]),
      ),
      render: (_, r) => {
        const p = PRIORITY_MAP[r.priority] || PRIORITY_MAP[2]
        return <Tag color={p.color}>{p.text}</Tag>
      },
    },
    {
      title: '进度',
      dataIndex: 'progress',
      width: 140,
      search: false,
      render: (_, r) => <Progress percent={r.progress} size="small" />,
    },
    { title: '开始', dataIndex: 'start_date', width: 110, search: false, render: (_, r) => r.start_date?.slice(0, 10) || '-' },
    { title: '截止', dataIndex: 'end_date', width: 110, search: false, render: (_, r) => r.end_date?.slice(0, 10) || '-' },
    {
      title: '项目经理',
      dataIndex: 'manager_id',
      width: 120,
      renderFormItem: () => <UserSelect placeholder="全部" />,
      render: (_, r) => r.manager_id ? `用户#${r.manager_id}` : '-',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openDetail(record.id)}>详情</Button>
          <Auth perm="project:edit">
            <Button type="link" size="small" onClick={() => { setEditingId(record.id); setEditOpen(true) }}>编辑</Button>
          </Auth>
          {record.status === 1 && (
            <Popconfirm title="开始项目?" onConfirm={() => handleStatusChange(record.id, 2)}>
              <Button type="link" size="small">开始</Button>
            </Popconfirm>
          )}
          {record.status === 2 && (
            <Popconfirm title="完成项目?" onConfirm={() => handleStatusChange(record.id, 4)}>
              <Button type="link" size="small">完成</Button>
            </Popconfirm>
          )}
          <Auth perm="project:delete">
            <Popconfirm title="确认删除?" okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger>删除</Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<ProjProject>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listProjects({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="project:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); setEditOpen(true) }}>
              新建项目
            </Button>
          </Auth>,
        ]}
        headerTitle="项目管理"
      />
      <ProjectEditModal open={editOpen} editingId={editingId} onOpenChange={setEditOpen} onSuccess={() => actionRef.current?.reload()} />
      <ProjectDetailDrawer open={detailOpen} projectId={detailId} onOpenChange={setDetailOpen} />
    </>
  )
}
