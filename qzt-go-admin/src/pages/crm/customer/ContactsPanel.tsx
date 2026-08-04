import { useEffect, useState } from 'react'
import { App, Button, Form, Input, Popconfirm, Space, Switch, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { ModalForm, ProFormText } from '@ant-design/pro-components'
import type { ColumnsType } from 'antd/es/table'
import {
  createContact,
  deleteContact,
  listCustomerContacts,
  updateContact,
} from '../../../services/crm'
import type { CrmContact } from '../../../types/crm'

interface ContactFormValues {
  name: string
  phone?: string
  email?: string
  position?: string
  department?: string
  is_key_decision_maker?: boolean
  remark?: string
}

/** 客户详情 - 联系人面板 */
export default function ContactsPanel({ customerId }: { customerId: number }) {
  const { message } = App.useApp()
  const [list, setList] = useState<CrmContact[]>([])
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm<ContactFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmContact | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setList(await listCustomerContacts(customerId))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ is_key_decision_maker: false })
    setModalOpen(true)
  }

  const openEdit = (record: CrmContact) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      phone: record.phone,
      email: record.email,
      position: record.position,
      department: record.department,
      is_key_decision_maker: record.is_key_decision_maker === 1,
      remark: record.remark,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: ContactFormValues) => {
    const payload = {
      name: values.name,
      phone: values.phone,
      email: values.email,
      position: values.position,
      department: values.department,
      is_key_decision_maker: values.is_key_decision_maker ? 1 : 0,
      remark: values.remark,
    }
    if (editing) {
      await updateContact(editing.id, payload)
      message.success('联系人已更新')
    } else {
      await createContact(customerId, payload)
      message.success('联系人已创建')
    }
    load()
    return true
  }

  const handleDelete = async (record: CrmContact) => {
    await deleteContact(record.id)
    message.success('联系人已删除')
    load()
  }

  const columns: ColumnsType<CrmContact> = [
    { title: '姓名', dataIndex: 'name' },
    { title: '职位', dataIndex: 'position', render: (v: string) => v || '-' },
    { title: '部门', dataIndex: 'department', render: (v: string) => v || '-' },
    { title: '电话', dataIndex: 'phone', render: (v: string) => v || '-' },
    { title: '邮箱', dataIndex: 'email', render: (v: string) => v || '-' },
    {
      title: '关键决策人',
      dataIndex: 'is_key_decision_maker',
      width: 100,
      render: (v: number) => (v === 1 ? <Tag color="gold">是</Tag> : '否'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: number) =>
        v === 1 ? <Tag color="success">正常</Tag> : <Tag>停用</Tag>,
    },
    {
      title: '操作',
      width: 110,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确认删除该联系人?"
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 12, textAlign: 'right' }}>
        <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreate}>
          新增联系人
        </Button>
      </div>
      <Table<CrmContact>
        rowKey="id"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={list}
        pagination={false}
      />
      <ModalForm<ContactFormValues>
        title={editing ? '编辑联系人' : '新增联系人'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={480}
      >
        <ProFormText
          name="name"
          label="姓名"
          rules={[{ required: true, message: '请输入姓名' }]}
        />
        <ProFormText name="phone" label="电话" />
        <ProFormText
          name="email"
          label="邮箱"
          rules={[{ type: 'email', message: '邮箱格式不正确' }]}
        />
        <ProFormText name="position" label="职位" />
        <ProFormText name="department" label="部门" />
        <Form.Item name="is_key_decision_maker" label="关键决策人" valuePropName="checked">
          <Switch checkedChildren="是" unCheckedChildren="否" />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={3} />
        </Form.Item>
      </ModalForm>
    </>
  )
}
