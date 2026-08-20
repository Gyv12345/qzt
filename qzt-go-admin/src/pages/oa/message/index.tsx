import { useRef, useState } from 'react'
import { App, Button, Modal, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { ProTable, type ActionType, type ProColumns } from '@ant-design/pro-components'
import ReactMarkdown from 'react-markdown'
import Auth from '../../../components/Auth'
import { deleteMessage, listInbox, listOutbox, markAllMessagesRead, markMessageRead } from '../../../services/oa'
import type { OaMessage } from '../../../types/oa'
import MessageEditModal from './EditModal'
import { pageIndexColumn } from '../../../components/IndexTag'

export default function MessagePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('inbox')
  const [previewing, setPreviewing] = useState<OaMessage | null>(null)

  const handleDelete = async (id: number) => {
    await deleteMessage(id)
    message.success('已删除')
    actionRef.current?.reload()
  }

  const handleMarkRead = async (id: number) => {
    await markMessageRead(id)
    actionRef.current?.reload()
  }

  const handleMarkAllRead = async () => {
    await markAllMessagesRead()
    message.success('全部已读')
    actionRef.current?.reload()
  }

  const columns: ProColumns<OaMessage>[] = [
    pageIndexColumn(actionRef, { width: 60 }),
    { title: '标题', dataIndex: 'title', width: 200, ellipsis: true,
      render: (_, r) => (
        <a onClick={() => { setPreviewing(r); if (r.is_read === 0) handleMarkRead(r.id) }}>
          {r.is_read === 0 && activeTab === 'inbox' ? <strong>{r.title}</strong> : r.title}
        </a>
      ),
    },
    {
      title: '格式',
      dataIndex: 'content_type',
      width: 70,
      search: false,
      render: (_, r) => r.content_type === 'markdown' ? <Tag color="blue">MD</Tag> : <Tag>文本</Tag>,
    },
    {
      title: activeTab === 'inbox' ? '发送人' : '收件人',
      dataIndex: activeTab === 'inbox' ? 'sender_id' : 'receiver_id',
      width: 80,
      search: false,
      render: (_, r) => (activeTab === 'inbox' ? r.sender_id : r.receiver_id) === 0 ? '系统' : (activeTab === 'inbox' ? r.sender_id : r.receiver_id),
    },
    {
      title: '状态',
      dataIndex: 'is_read',
      width: 70,
      search: false,
      render: (_, r) => r.is_read === 0 ? <Tag color="error">未读</Tag> : <Tag>已读</Tag>,
    },
    { title: '时间', dataIndex: 'created_at', valueType: 'dateTime', width: 160, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setPreviewing(record); if (record.is_read === 0) handleMarkRead(record.id) }}>查看</Button>
          {activeTab === 'inbox' && (
            <Popconfirm title="确认删除?" okText="删除" okButtonProps={{ danger: true }} cancelText="取消" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<OaMessage>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        request={async (params) => {
          const { current, pageSize } = params
          const fn = activeTab === 'inbox' ? listInbox : listOutbox
          const data = await fn({ page: current || 1, page_size: pageSize || 10 })
          return { data: data.list, total: data.total, success: true }
        }}
        toolBarRender={() => [
          activeTab === 'inbox' ? (
            <Button key="readall" onClick={handleMarkAllRead}>全部已读</Button>
          ) : null,
          <Auth perm="oa:message:send" key="send">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditOpen(true)}>写信</Button>
          </Auth>,
        ]}
        headerTitle={
          <Space>
            <Button type={activeTab === 'inbox' ? 'primary' : 'default'} onClick={() => { setActiveTab('inbox'); actionRef.current?.reload() }}>收件箱</Button>
            <Button type={activeTab === 'outbox' ? 'primary' : 'default'} onClick={() => { setActiveTab('outbox'); actionRef.current?.reload() }}>发件箱</Button>
          </Space>
        }
      />
      <MessageEditModal open={editOpen} onOpenChange={setEditOpen} onSuccess={() => actionRef.current?.reload()} />

      {/* 消息详情 */}
      <Modal
        title={previewing?.title}
        open={!!previewing}
        onCancel={() => setPreviewing(null)}
        footer={null}
        width={640}
        destroyOnHidden
      >
        {previewing && (
          <div>
            <div style={{ marginBottom: 12, color: '#999', fontSize: 12 }}>
              {previewing.sender_id === 0 ? '系统消息' : `发送人ID: ${previewing.sender_id}`} · {previewing.created_at?.slice(0, 16)}
            </div>
            {previewing.content_type === 'markdown' ? (
              <div className="markdown-body" style={{ overflowX: 'auto' }}>
                <ReactMarkdown>{previewing.content}</ReactMarkdown>
              </div>
            ) : (
              <div style={{ whiteSpace: 'pre-wrap' }}>{previewing.content}</div>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
