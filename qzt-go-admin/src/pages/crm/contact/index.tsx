import { useRef, useState } from 'react'
import { App, Button, Col, Form, Popconfirm, Space, Switch, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ProForm,
  ModalForm,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import CustomerSelect from '../../../components/CustomerSelect'
import ExportButtons from '../../../components/ExportButtons'
import {
  createContact,
  deleteContact,
  listContacts,
  updateContact,
  type CrmContactListItem,
} from '../../../services/crm'
import type { CrmContactPayload } from '../../../types/crm'
import { maskPhone, maskEmail } from '../../../utils/mask'
import DetailDrawer from './DetailDrawer'

interface ContactFormValues {
  name: string
  customer_id: number
  phone?: string
  email?: string
  position?: string
  department?: string
  is_key_decision_maker: boolean
  status: boolean
  remark?: string
}

export default function ContactPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<ContactFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CrmContactListItem | null>(null)
  const [detailTarget, setDetailTarget] = useState<CrmContactListItem | null>(null)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ is_key_decision_maker: false, status: true })
    setModalOpen(true)
  }

  const openEdit = (record: CrmContactListItem) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      customer_id: record.customer_id,
      phone: record.phone || undefined,
      email: record.email || undefined,
      position: record.position || undefined,
      department: record.department || undefined,
      is_key_decision_maker: record.is_key_decision_maker === 1,
      status: record.status === 1,
      remark: record.remark || undefined,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: ContactFormValues) => {
    const payload: CrmContactPayload = {
      customer_id: values.customer_id,
      name: values.name,
      phone: values.phone,
      email: values.email,
      position: values.position,
      department: values.department,
      is_key_decision_maker: values.is_key_decision_maker ? 1 : 0,
      status: values.status ? 1 : 2,
      remark: values.remark,
    }
    if (editing) {
      await updateContact(editing.id, payload)
      message.success('联系人已更新')
    } else {
      // 全局新增:后端按 payload.customer_id 归属
      await createContact(values.customer_id, payload)
      message.success('联系人已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: CrmContactListItem) => {
    await deleteContact(record.id)
    message.success('联系人已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<CrmContactListItem>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '搜索姓名/电话/邮箱' },
    },
    {
      title: '姓名',
      dataIndex: 'name',
      width: 120,
      search: false,
      render: (v, r) => (
        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setDetailTarget(r)}>
          {v}
        </Button>
      ),
    },
    { title: '客户', dataIndex: 'customer_name', width: 180, search: false, ellipsis: true },
    { title: '职务', dataIndex: 'position', width: 120, search: false, render: (v) => v || '-' },
    { title: '部门', dataIndex: 'department', width: 120, search: false, render: (v) => v || '-' },
    { title: '电话', dataIndex: 'phone', width: 140, search: false, render: (v) => maskPhone(v as string) || '-' },
    { title: '邮箱', dataIndex: 'email', width: 200, search: false, ellipsis: true, render: (v) => maskEmail(v as string) || '-' },
    {
      title: '决策人',
      dataIndex: 'is_key_decision_maker',
      width: 90,
      search: false,
      render: (_, r) => (r.is_key_decision_maker === 1 ? <Tag color="gold">是</Tag> : '否'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      search: false,
      valueEnum: {
        1: { text: '正常', status: 'Success' },
        2: { text: '停用', status: 'Default' },
      },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 170,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => setDetailTarget(record)}>
            详情
          </Button>
          <Auth perm="crm:contact:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="crm:contact:delete">
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
          </Auth>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable<CrmContactListItem>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        headerTitle="联系人列表"
        request={async (params) => {
          const { current, pageSize, ...rest } = params
          const res = await listContacts({
            page: current,
            page_size: pageSize,
            keyword: rest.keyword as string | undefined,
          })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="crm:contact:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增联系人
            </Button>
          </Auth>,
          <ExportButtons
            key="export"
            fileName="联系人列表"
            columns={columns}
            fetchAll={async () => {
              const res = await listContacts({ page: 1, page_size: 1000 })
              return res.list
            }}
          />,
        ]}
      />

      <ModalForm<ContactFormValues>
        title={editing ? '编辑联系人' : '新增联系人'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <ProFormText
          name="name"
          label="姓名"
          rules={[{ required: true, message: '请输入姓名' }]}
          colProps={{ span: 12 }}
        />
        <Col span={12}>
          <ProForm.Item
            name="customer_id"
            label="客户"
            rules={[{ required: true, message: '请选择客户' }]}
          >
            <CustomerSelect />
          </ProForm.Item>
        </Col>
        <ProFormText name="phone" label="电话" colProps={{ span: 12 }} />
        <ProFormText
          name="email"
          label="邮箱"
          rules={[{ type: 'email', message: '邮箱格式不正确' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText name="position" label="职务" colProps={{ span: 12 }} />
        <ProFormText name="department" label="部门" colProps={{ span: 12 }} />
        <Col span={12}>
          <ProForm.Item name="is_key_decision_maker" label="关键决策人" valuePropName="checked">
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </ProForm.Item>
        </Col>
        <Col span={12}>
          <ProForm.Item name="status" label="状态" valuePropName="checked">
            <Switch checkedChildren="正常" unCheckedChildren="停用" />
          </ProForm.Item>
        </Col>
        <ProFormTextArea name="remark" label="备注" fieldProps={{ rows: 3 }} colProps={{ span: 24 }} />
      </ModalForm>

      {/* 联系人详情抽屉 */}
      <DetailDrawer
        contact={detailTarget}
        open={!!detailTarget}
        onClose={() => setDetailTarget(null)}
      />
    </>
  )
}
