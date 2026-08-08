import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { deleteMeetingRoom, listMeetingRooms } from '../../../services/oa'
import { MEETING_ROOM_STATUS_MAP, type OaMeetingRoom } from '../../../types/oa'
import MeetingRoomEditModal from './EditModal'

export default function MeetingRoomPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  const handleDelete = async (id: number) => {
    await deleteMeetingRoom(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<OaMeetingRoom>[] = [
    { title: '编号', valueType: 'indexBorder', width: 60 },
    { title: '名称', dataIndex: 'name', width: 160 },
    { title: '位置', dataIndex: 'location', width: 180, search: false, ellipsis: true },
    { title: '容量(人)', dataIndex: 'capacity', width: 90, search: false },
    { title: '设备', dataIndex: 'equipment', width: 200, search: false, ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      valueEnum: {
        ENABLED: { text: '可用' },
        DISABLED: { text: '停用' },
        MAINTENANCE: { text: '维护中' },
      },
      render: (_, r) => {
        const m = MEETING_ROOM_STATUS_MAP[r.status] ?? MEETING_ROOM_STATUS_MAP.ENABLED
        return <Tag color={m.color}>{m.text}</Tag>
      },
    },
    { title: '备注', dataIndex: 'remark', width: 200, search: false, ellipsis: true },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="oa:meetingroom:edit">
            <Button type="link" size="small" onClick={() => { setEditingId(record.id); setEditOpen(true) }}>编辑</Button>
          </Auth>
          <Auth perm="oa:meetingroom:delete">
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
      <ProTable<OaMeetingRoom>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listMeetingRooms({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="oa:meetingroom:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); setEditOpen(true) }}>新增会议室</Button>
          </Auth>,
        ]}
        headerTitle="会议室管理"
      />
      <MeetingRoomEditModal open={editOpen} editingId={editingId} onOpenChange={setEditOpen} onSuccess={() => actionRef.current?.reload()} />
    </>
  )
}
