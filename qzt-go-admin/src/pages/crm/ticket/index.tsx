import { useRef, useState } from 'react'
import { App, Button, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { deleteTicket, listTickets } from '../../../services/crm'
import { TICKET_STATUS, TICKET_PRIORITY, type CrmTicket } from '../../../types/crm'
import TicketEditModal from './EditModal'
import TicketDetailDrawer from './DetailDrawer'

export default function TicketPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [detailId, setDetailId] = useState<number | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const openDetail = (id: number) => { setDetailId(id); setDetailOpen(true) }

  const handleDelete = async (id: number) => {
    await deleteTicket(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<CrmTicket>[] = [
    { title: '编号', valueType: 'indexBorder', width: 60 },
    {
      title: '工单号', dataIndex: 'ticket_no', width: 140,
      render: (_, r) => <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openDetail(r.id)}>{r.ticket_no}</Button>,
    },
    { title: '标题', dataIndex: 'title', width: 200, ellipsis: true },
    { title: '客户', dataIndex: 'customer_name', width: 140, ellipsis: true, search: false },
    { title: '联系人', dataIndex: 'contact_name', width: 90, search: false },
    {
      title: '优先级', dataIndex: 'priority', width: 80,
      valueType: 'select',
      valueEnum: Object.fromEntries(Object.entries(TICKET_PRIORITY).map(([k, v]) => [k, { text: v.text }])),
      render: (_, r) => { const p = TICKET_PRIORITY[r.priority] || TICKET_PRIORITY[2]; return <Tag color={p.color}>{p.text}</Tag> },
    },
    {
      title: '状态', dataIndex: 'status', width: 100,
      valueType: 'select',
      valueEnum: Object.fromEntries(Object.entries(TICKET_STATUS).map(([k, v]) => [k, { text: v.text }])),
      render: (_, r) => { const s = TICKET_STATUS[r.status] || TICKET_STATUS[1]; return <Tag color={s.color}>{s.text}</Tag> },
    },
    { title: '创建时间', dataIndex: 'created_at', width: 160, search: false },
    {
      title: '操作', valueType: 'option', width: 140, fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openDetail(record.id)}>详情</Button>
          {record.status !== 4 && (
            <Auth perm="crm:ticket:edit">
              <Button type="link" size="small" onClick={() => { setEditingId(record.id); setEditOpen(true) }}>编辑</Button>
            </Auth>
          )}
          <Auth perm="crm:ticket:delete">
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
      <ProTable<CrmTicket>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const data = await listTickets({ page: current || 1, page_size: pageSize || 10, ...rest })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          <Auth perm="crm:ticket:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditingId(null); setEditOpen(true) }}>新建工单</Button>
          </Auth>,
        ]}
        headerTitle="售后工单"
      />
      <TicketEditModal open={editOpen} editingId={editingId} onOpenChange={setEditOpen} onSuccess={() => actionRef.current?.reload()} />
      <TicketDetailDrawer open={detailOpen} ticketId={detailId} onOpenChange={setDetailOpen} onSuccess={() => actionRef.current?.reload()} />
    </>
  )
}
