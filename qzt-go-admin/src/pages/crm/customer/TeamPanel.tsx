import { useEffect, useState } from 'react'
import { App, Button, Form, Modal, Popconfirm, Select, Space, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import UserSelect from '../../../components/UserSelect'
import {
  addCollaboration,
  deleteCollaboration,
  listCollaborations,
  updateCollaboration,
  type CrmCollaboration,
} from '../../../services/crm'

type CollabType = 'READ_ONLY' | 'COLLABORATION'

const TYPE_OPTIONS = [
  { label: '只读', value: 'READ_ONLY' },
  { label: '协作', value: 'COLLABORATION' },
]

function typeTag(t: CollabType) {
  if (t === 'COLLABORATION') return <Tag color="blue">协作</Tag>
  return <Tag>只读</Tag>
}

interface AddFormValues {
  user_id: number
  collaboration_type: CollabType
}

/** 客户详情 - 团队协作面板 */
export default function TeamPanel({ customerId }: { customerId: number }) {
  const { message } = App.useApp()
  const [list, setList] = useState<CrmCollaboration[]>([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [form] = Form.useForm<AddFormValues>()

  const load = async () => {
    setLoading(true)
    try {
      setList(await listCollaborations(customerId))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ collaboration_type: 'READ_ONLY' })
    setModalOpen(true)
  }

  const handleAdd = async () => {
    const values = await form.validateFields()
    await addCollaboration(customerId, {
      user_id: values.user_id,
      collaboration_type: values.collaboration_type,
    })
    message.success('成员已添加')
    setModalOpen(false)
    load()
  }

  const handleTypeChange = async (record: CrmCollaboration, type: CollabType) => {
    await updateCollaboration(record.id, { collaboration_type: type })
    message.success('权限已更新')
    load()
  }

  const handleDelete = async (record: CrmCollaboration) => {
    await deleteCollaboration(record.id)
    message.success('成员已移除')
    load()
  }

  const columns: ColumnsType<CrmCollaboration> = [
    { title: '昵称', dataIndex: 'nickname', render: (v: string) => v || '-' },
    { title: '用户名', dataIndex: 'username', render: (v: string) => v || '-' },
    {
      title: '权限',
      dataIndex: 'collaboration_type',
      width: 220,
      render: (t: CollabType, record) => (
        <Space>
          {typeTag(t)}
          <Select
            size="small"
            value={t}
            options={TYPE_OPTIONS}
            style={{ width: 100 }}
            onChange={(v: CollabType) => handleTypeChange(record, v)}
          />
        </Space>
      ),
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title="确认移除该协作成员?"
          okText="移除"
          okButtonProps={{ danger: true }}
          cancelText="取消"
          onConfirm={() => handleDelete(record)}
        >
          <Button type="link" size="small" danger>
            移除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 12, textAlign: 'right' }}>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreate}>
          添加成员
        </Button>
      </div>
      <Table<CrmCollaboration>
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={false}
      />
      <Modal
        title="添加协作成员"
        open={modalOpen}
        onOk={handleAdd}
        onCancel={() => setModalOpen(false)}
        destroyOnHidden
        maskClosable={false}
        okText="添加"
        cancelText="取消"
        width={440}
      >
        <Form<AddFormValues> form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="user_id"
            label="选择用户"
            rules={[{ required: true, message: '请选择用户' }]}
          >
            <UserSelect style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="collaboration_type"
            label="权限"
            rules={[{ required: true, message: '请选择权限' }]}
          >
            <Select options={TYPE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
