import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { deleteTrip, listTrips, submitTripApproval } from '../../../services/oa'
import { APPROVAL_STATUS_MAP, type OaBusinessTrip } from '../../../types/oa'
import TripEditModal from './EditModal'

export default function TripPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const handleSubmit = async (record: OaBusinessTrip) => {
    await submitTripApproval(record.id)
    message.success('已提交审批')
    actionRef.current?.reload()
  }

  const handleDelete = async (id: number) => {
    await deleteTrip(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<OaBusinessTrip>[] = [
    { title: '编号', valueType: 'indexBorder', width: 60 },
    { title: '单号', dataIndex: 'trip_no', width: 150 },
    { title: '标题', dataIndex: 'title', width: 180, ellipsis: true },
    { title: '目的地', dataIndex: 'destination', width: 120 },
    { title: '出发', dataIndex: 'start_date', width: 120, search: false, render: (_, r) => r.start_date?.slice(0, 10) },
    { title: '返回', dataIndex: 'end_date', width: 120, search: false, render: (_, r) => r.end_date?.slice(0, 10) },
    { title: '交通', dataIndex: 'transport', width: 80, search: false },
    { title: '预算', dataIndex: 'budget_amount', width: 100, search: false, render: (_, r) => r.budget_amount ? `¥${r.budget_amount}` : '-' },
    {
      title: '审批状态',
      dataIndex: 'approval_status',
      width: 100,
      render: (_, r) => {
        const s = APPROVAL_STATUS_MAP[r.approval_status] ?? APPROVAL_STATUS_MAP.NONE
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.approval_status === 'NONE' && (
            <Popconfirm title="提交审批?" okText="提交" cancelText="取消" onConfirm={() => handleSubmit(record)}>
              <Button type="link" size="small">提交审批</Button>
            </Popconfirm>
          )}
          {(record.approval_status === 'NONE' || record.approval_status === 'REJECTED') && (
            <Auth perm="oa:trip:edit">
              <Button type="link" size="small" onClick={() => { setEditingId(record.id); setEditOpen(true) }}>编辑</Button>
            </Auth>
          )}
          {record.approval_status === 'NONE' && (
            <Auth perm="oa:trip:delete">
              <Popconfirm title="确认删除?" okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => handleDelete(record.id)}>
                <Button type="link" size="small" danger>删除</Button>
              </Popconfirm>
            </Auth>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<OaBusinessTrip>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listTrips({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="oa:trip:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); setEditOpen(true) }}>新增出差</Button>
          </Auth>,
        ]}
        headerTitle="出差管理"
      />
      <TripEditModal open={editOpen} editingId={editingId} onOpenChange={setEditOpen} onSuccess={() => actionRef.current?.reload()} />
    </>
  )
}
