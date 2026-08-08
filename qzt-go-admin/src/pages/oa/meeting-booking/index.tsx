import { useRef, useState, useEffect } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { deleteMeetingBooking, listMeetingBookings, listMeetingRooms, submitMeetingBookingApproval } from '../../../services/oa'
import { APPROVAL_STATUS_MAP, type OaMeetingBooking, type OaMeetingRoom } from '../../../types/oa'
import MeetingBookingEditModal from './EditModal'

export default function MeetingBookingPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [rooms, setRooms] = useState<OaMeetingRoom[]>([])

  useEffect(() => {
    listMeetingRooms({ page: 1, page_size: 100 }).then((res) => setRooms(res.list || []))
  }, [])

  const roomMap = new Map(rooms.map((r) => [r.id, r.name]))

  const handleSubmit = async (record: OaMeetingBooking) => {
    await submitMeetingBookingApproval(record.id)
    message.success('已提交审批')
    actionRef.current?.reload()
  }

  const handleDelete = async (id: number) => {
    await deleteMeetingBooking(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<OaMeetingBooking>[] = [
    { title: '编号', valueType: 'indexBorder', width: 60 },
    { title: '单号', dataIndex: 'booking_no', width: 160, search: false },
    { title: '标题', dataIndex: 'title', width: 200, ellipsis: true },
    {
      title: '会议室',
      dataIndex: 'room_id',
      width: 120,
      valueType: 'select',
      valueEnum: Object.fromEntries(rooms.map((r) => [r.id, { text: r.name }])),
      render: (_, r) => roomMap.get(r.room_id) || r.room_id,
    },
    { title: '开始时间', dataIndex: 'start_time', width: 170, search: false, render: (_, r) => r.start_time?.slice(0, 16) },
    { title: '结束时间', dataIndex: 'end_time', width: 170, search: false, render: (_, r) => r.end_time?.slice(0, 16) },
    { title: '人数', dataIndex: 'attendees', width: 70, search: false },
    {
      title: '审批状态',
      dataIndex: 'approval_status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        NONE: { text: '未提交' },
        APPROVING: { text: '审批中' },
        APPROVED: { text: '已通过' },
        REJECTED: { text: '已驳回' },
        REVOKED: { text: '已撤回' },
      },
      render: (_, r) => {
        const s = APPROVAL_STATUS_MAP[r.approval_status] ?? APPROVAL_STATUS_MAP.NONE
        return <Tag color={s.color}>{s.text}</Tag>
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {record.approval_status === 'NONE' && (
            <Popconfirm title="提交审批?" okText="提交" cancelText="取消" onConfirm={() => handleSubmit(record)}>
              <Button type="link" size="small">提交审批</Button>
            </Popconfirm>
          )}
          {(record.approval_status === 'NONE' || record.approval_status === 'REJECTED') && (
            <Auth perm="oa:meeting:edit">
              <Button type="link" size="small" onClick={() => { setEditingId(record.id); setEditOpen(true) }}>编辑</Button>
            </Auth>
          )}
          {record.approval_status === 'NONE' && (
            <Auth perm="oa:meeting:delete">
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
      <ProTable<OaMeetingBooking>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listMeetingBookings({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="oa:meeting:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); setEditOpen(true) }}>新增预订</Button>
          </Auth>,
        ]}
        headerTitle="会议预订"
      />
      <MeetingBookingEditModal open={editOpen} editingId={editingId} onOpenChange={setEditOpen} onSuccess={() => actionRef.current?.reload()} />
    </>
  )
}
