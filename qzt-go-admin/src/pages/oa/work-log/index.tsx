import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { deleteWorkLog, listWorkLogs } from '../../../services/oa'
import { LOG_TYPE_MAP, type OaWorkLog } from '../../../types/oa'
import WorkLogEditModal from './EditModal'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function WorkLogPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    await deleteWorkLog(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<OaWorkLog>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '单号', dataIndex: 'log_no', width: 150, search: false },
    {
      title: '类型',
      dataIndex: 'log_type',
      width: 80,
      valueType: 'select',
      valueEnum: {
        DAILY: { text: '日报' },
        WEEKLY: { text: '周报' },
        MONTHLY: { text: '月报' },
      },
      render: (_, r) => <Tag>{LOG_TYPE_MAP[r.log_type] ?? r.log_type}</Tag>,
    },
    {
      title: '日期',
      dataIndex: 'log_date',
      width: 120,
      valueType: 'date',
      render: (_, r) => r.log_date?.slice(0, 10),
    },
    { title: '今日完成', dataIndex: 'content', width: 250, ellipsis: true, search: false },
    { title: '明日计划', dataIndex: 'plan', width: 250, ellipsis: true, search: false },
    { title: '遇到问题', dataIndex: 'problems', width: 200, ellipsis: true, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="oa:worklog:edit">
            <Button type="link" size="small" onClick={() => { setEditingId(record.id); setEditOpen(true) }}>编辑</Button>
          </Auth>
          <Auth perm="oa:worklog:delete">
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
      <ProTable<OaWorkLog>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listWorkLogs({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="oa:worklog:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); setEditOpen(true) }}>新增日志</Button>
          </Auth>,
        ]}
        headerTitle="工作日志"
      />
      <WorkLogEditModal open={editOpen} editingId={editingId} onOpenChange={setEditOpen} onSuccess={() => actionRef.current?.reload()} />
    </>
  )
}
