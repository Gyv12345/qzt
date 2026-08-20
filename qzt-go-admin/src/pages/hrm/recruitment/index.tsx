import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { deleteJob, listJobs, updateJob } from '../../../services/hrm'
import { JOB_STATUS, type HrmJob } from '../../../types/hrm'
import JobEditModal from './JobEditModal'
import CandidateDrawer from './CandidateDrawer'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function RecruitmentPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [jobDetailId, setJobDetailId] = useState<number | null>(null)
  const [candOpen, setCandOpen] = useState(false)

  const handleStatusChange = async (id: number, status: number) => {
    await updateJob(id, { title: '', status })
    message.success('状态已更新')
    actionRef.current?.reload()
  }

  const handleDelete = async (id: number) => {
    await deleteJob(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<HrmJob>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '职位编号', dataIndex: 'job_no', width: 140 },
    {
      title: '职位名称', dataIndex: 'title', width: 180,
      render: (_, r) => <Button type="link" size="small" style={{ padding: 0 }} onClick={() => { setJobDetailId(r.id); setCandOpen(true) }}>{r.title}</Button>,
    },
    { title: '部门', dataIndex: 'dept_name', width: 120, search: false },
    { title: '人数', dataIndex: 'headcount', width: 60, search: false },
    { title: '薪资', dataIndex: 'salary_range', width: 120, search: false },
    { title: '学历', dataIndex: 'education', width: 80, search: false },
    {
      title: '状态', dataIndex: 'status', width: 100,
      valueType: 'select',
      valueEnum: Object.fromEntries(Object.entries(JOB_STATUS).map(([k, v]) => [k, { text: v.text }])),
      render: (_, r) => { const s = JOB_STATUS[r.status] || JOB_STATUS[1]; return <Tag color={s.color}>{s.text}</Tag> },
    },
    {
      title: '操作', valueType: 'option', width: 200, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setJobDetailId(record.id); setCandOpen(true) }}>候选人</Button>
          <Auth perm="hrm:recruitment:edit">
            <Button type="link" size="small" onClick={() => { setEditingId(record.id); setEditOpen(true) }}>编辑</Button>
          </Auth>
          {record.status === 1 && (
            <Popconfirm title="发布招聘?" onConfirm={() => handleStatusChange(record.id, 2)}>
              <Button type="link" size="small">发布</Button>
            </Popconfirm>
          )}
          {record.status === 2 && (
            <Popconfirm title="关闭招聘?" onConfirm={() => handleStatusChange(record.id, 4)}>
              <Button type="link" size="small">关闭</Button>
            </Popconfirm>
          )}
          <Auth perm="hrm:recruitment:delete">
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
      <ProTable<HrmJob>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listJobs({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="hrm:recruitment:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); setEditOpen(true) }}>新增职位</Button>
          </Auth>,
        ]}
        headerTitle="招聘管理"
      />
      <JobEditModal open={editOpen} editingId={editingId} onOpenChange={setEditOpen} onSuccess={() => actionRef.current?.reload()} />
      <CandidateDrawer open={candOpen} jobId={jobDetailId} onOpenChange={setCandOpen} />
    </>
  )
}
