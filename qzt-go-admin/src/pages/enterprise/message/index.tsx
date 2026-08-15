import { useRef, useState, type Key } from 'react'
import { App, Badge, Button, Col, Descriptions, Form, Modal, Popconfirm, Space, Tabs } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProForm,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import UserSelect from '../../../components/UserSelect'
import {
  deleteMessage,
  listInbox,
  listOutbox,
  markAllMessagesRead,
  markMessageRead,
  markMessagesRead,
  sendMessage,
} from '../../../services/enterprise'
import type { EntMessage } from '../../../types/enterprise'
import { useUserStore } from '../../../stores/users'

type BoxType = 'inbox' | 'outbox'

interface SendFormValues {
  receiver_id: number
  title: string
  content: string
}

/** 未读判断:is_read 为 0 或无 read_time */
const isUnread = (record: EntMessage) => record.is_read === 0 || !record.read_time

export default function MessagePage() {
  const { message } = App.useApp()
  const nickname = useUserStore((s) => s.nickname)
  const [activeTab, setActiveTab] = useState<BoxType>('inbox')
  const inboxRef = useRef<ActionType>(null)
  const outboxRef = useRef<ActionType>(null)
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([])
  const [viewing, setViewing] = useState<EntMessage | null>(null)
  const [sendOpen, setSendOpen] = useState(false)
  const [sendForm] = Form.useForm<SendFormValues>()

  const reload = (box: BoxType) => {
    if (box === 'inbox') inboxRef.current?.reload()
    else outboxRef.current?.reload()
  }

  const handleTabChange = (key: string) => {
    const box = key as BoxType
    setActiveTab(box)
    reload(box)
  }

  const handleView = async (record: EntMessage, box: BoxType) => {
    setViewing(record)
    if (box === 'inbox' && isUnread(record)) {
      try {
        await markMessageRead(record.id)
        setSelectedRowKeys([])
        inboxRef.current?.reload()
      } catch {
        // 标记已读失败不阻断查看
      }
    }
  }

  const handleDelete = async (record: EntMessage, box: BoxType) => {
    await deleteMessage(record.id)
    message.success('消息已删除')
    setSelectedRowKeys([])
    reload(box)
  }

  const handleBatchRead = async () => {
    const ids = selectedRowKeys.map(Number)
    await markMessagesRead(ids)
    message.success('已标记为已读')
    setSelectedRowKeys([])
    inboxRef.current?.reload()
  }

  const handleReadAll = async () => {
    await markAllMessagesRead()
    message.success('全部已标记为已读')
    setSelectedRowKeys([])
    inboxRef.current?.reload()
  }

  const handleSend = async (values: SendFormValues) => {
    const payload = {
      receiver_id: values.receiver_id,
      title: values.title,
      content: values.content,
    }
    await sendMessage(payload)
    message.success('消息已发送')
    sendForm.resetFields()
    inboxRef.current?.reload()
    outboxRef.current?.reload()
    return true
  }

  const buildColumns = (box: BoxType): ProColumns<EntMessage>[] => [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    {
      title: '标题',
      dataIndex: 'title',
      width: 220,
      ellipsis: true,
      render: (_, record) =>
        box === 'inbox' && isUnread(record) ? (
          <Space size={4}>
            <Badge status="processing" />
            <strong>{record.title}</strong>
          </Space>
        ) : (
          record.title
        ),
    },
    ...(box === 'inbox'
      ? ([
          {
            title: '发送人',
            dataIndex: 'sender_id',
            width: 140,
            search: false,
            render: (_: unknown, record: EntMessage) => nickname(record.sender_id),
          },
        ] as ProColumns<EntMessage>[])
      : ([
          {
            title: '接收人',
            dataIndex: 'receiver_id',
            width: 140,
            search: false,
            render: (_: unknown, record: EntMessage) => nickname(record.receiver_id),
          },
        ] as ProColumns<EntMessage>[])),
    { title: '内容', dataIndex: 'content', width: 280, ellipsis: true, search: false },
    ...(box === 'inbox'
      ? ([
          {
            title: '状态',
            dataIndex: 'is_read',
            width: 90,
            search: false,
            render: (_: unknown, record: EntMessage) =>
              isUnread(record) ? <Badge status="warning" text="未读" /> : <Badge status="default" text="已读" />,
          },
        ] as ProColumns<EntMessage>[])
      : []),
    {
      title: '时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          {/* eslint-disable-next-line react-hooks/refs -- handleView 内部读 inboxRef,但仅在用户点击 onClick 时执行,非渲染期访问 */}
          <Button type="link" size="small" onClick={() => handleView(record, box)}>
            查看
          </Button>
          <Auth perm="enterprise:message:delete">
            <Popconfirm
              title="确认删除该消息?"
              okText="删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => handleDelete(record, box)}
            >
              <Button type="link" size="small" danger>
                删除
              </Button>
            </Popconfirm>
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          {
            key: 'inbox',
            label: '收件箱',
            children: (
              <ProTable<EntMessage>
                rowKey="id"
                actionRef={inboxRef}
                columns={buildColumns('inbox')}
                scroll={{ x: 'max-content' }}
                search={false}
                rowSelection={{
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                }}
                tableAlertRender={false}
                request={async ({ current, pageSize, ...rest }) => {
                  const res = await listInbox({ page: current, page_size: pageSize, ...rest })
                  return { data: res.list, total: res.total, success: true }
                }}
                pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                toolBarRender={() => [
                  <Button
                    key="batch-read"
                    disabled={selectedRowKeys.length === 0}
                    onClick={handleBatchRead}
                  >
                    批量已读
                  </Button>,
                  <Popconfirm
                    key="read-all"
                    title="确认将全部消息标记为已读?"
                    okText="确认"
                    cancelText="取消"
                    onConfirm={handleReadAll}
                  >
                    <Button>全部已读</Button>
                  </Popconfirm>,
                  <Auth perm="enterprise:message:send" key="send">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setSendOpen(true)}>
                      发消息
                    </Button>
                  </Auth>,
                ]}
                headerTitle="收件箱"
              />
            ),
          },
          {
            key: 'outbox',
            label: '发件箱',
            children: (
              <ProTable<EntMessage>
                rowKey="id"
                actionRef={outboxRef}
                columns={buildColumns('outbox')}
                scroll={{ x: 'max-content' }}
                search={false}
                request={async ({ current, pageSize, ...rest }) => {
                  const res = await listOutbox({ page: current, page_size: pageSize, ...rest })
                  return { data: res.list, total: res.total, success: true }
                }}
                pagination={{ defaultPageSize: 10, showSizeChanger: true }}
                toolBarRender={() => [
                  <Auth perm="enterprise:message:send" key="send">
                    <Button type="primary" icon={<PlusOutlined />} onClick={() => setSendOpen(true)}>
                      发消息
                    </Button>
                  </Auth>,
                ]}
                headerTitle="发件箱"
              />
            ),
          },
        ]}
      />
      <Modal
        title="消息详情"
        open={!!viewing}
        onCancel={() => setViewing(null)}
        footer={null}
        width={640}
        destroyOnHidden
      >
        {viewing && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="标题">{viewing.title}</Descriptions.Item>
            <Descriptions.Item label="发送人">{nickname(viewing.sender_id)}</Descriptions.Item>
            <Descriptions.Item label="时间">{viewing.created_at}</Descriptions.Item>
            <Descriptions.Item label="内容">
              <div style={{ whiteSpace: 'pre-wrap' }}>{viewing.content}</div>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
      <ModalForm<SendFormValues>
        title="发消息"
        form={sendForm}
        open={sendOpen}
        onOpenChange={setSendOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSend}
        width={640}
        grid
      >
        <Col span={12}>
          <ProForm.Item
            name="receiver_id"
            label="接收人"
            rules={[{ required: true, message: '请选择接收人' }]}
          >
            <UserSelect placeholder="选择接收人" />
          </ProForm.Item>
        </Col>
        <ProFormText
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入标题' }]}
          placeholder="消息标题"
          colProps={{ span: 12 }}
        />
        <ProFormTextArea
          name="content"
          label="内容"
          rules={[{ required: true, message: '请输入内容' }]}
          placeholder="消息内容"
          fieldProps={{ rows: 4 }}
          colProps={{ span: 24 }}
        />
      </ModalForm>
    </>
  )
}
