import { useRef, useState } from 'react'
import { App, Button, Form, Popconfirm, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import ExportButtons from '../../../components/ExportButtons'
import {
  createSupplier,
  deleteSupplier,
  listSuppliers,
  updateSupplier,
} from '../../../services/psi'
import type { PsiSupplier, PsiSupplierPayload } from '../../../types/psi'
import { pageIndexColumn } from '../../../components/IndexTag'

interface SupplierFormValues {
  name: string
  supplier_no?: string
  contact_person?: string
  phone?: string
  email?: string
  address?: string
  bank_name?: string
  bank_account?: string
  status: number
  remark?: string
}

export default function SupplierPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<SupplierFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PsiSupplier | null>(null)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: 1 })
    setModalOpen(true)
  }

  const openEdit = (record: PsiSupplier) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      supplier_no: record.supplier_no,
      contact_person: record.contact_person,
      phone: record.phone,
      email: record.email,
      address: record.address,
      bank_name: record.bank_name,
      bank_account: record.bank_account,
      status: record.status,
      remark: record.remark,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: SupplierFormValues) => {
    const payload: PsiSupplierPayload = {
      name: values.name,
      supplier_no: values.supplier_no || undefined,
      contact_person: values.contact_person || undefined,
      phone: values.phone || undefined,
      email: values.email || undefined,
      address: values.address || undefined,
      bank_name: values.bank_name || undefined,
      bank_account: values.bank_account || undefined,
      status: values.status,
      remark: values.remark || undefined,
    }
    if (editing) {
      await updateSupplier(editing.id, payload)
      message.success('供应商已更新')
    } else {
      await createSupplier(payload)
      message.success('供应商已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: PsiSupplier) => {
    await deleteSupplier(record.id)
    message.success('供应商已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<PsiSupplier>[] = [
    pageIndexColumn(actionRef),
    { title: '名称', dataIndex: 'name', width: 180, search: false },
    { title: '编号', dataIndex: 'supplier_no', width: 140, search: false },
    { title: '联系人', dataIndex: 'contact_person', width: 110, search: false },
    { title: '电话', dataIndex: 'phone', width: 140, search: false },
    { title: '邮箱', dataIndex: 'email', width: 180, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueEnum: {
        1: { text: '启用', status: 'Success' },
        0: { text: '停用', status: 'Default' },
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      width: 170,
      search: false,
    },
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '名称/编号/联系人' },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="psi:supplier:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="psi:supplier:delete">
            <Popconfirm
              title="确认删除该供应商?"
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
      <ProTable<PsiSupplier>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listSuppliers({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="psi:supplier:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增供应商
            </Button>
          </Auth>,
          <ExportButtons
            key="export"
            fileName="供应商列表"
            columns={columns}
            fetchAll={async () => {
              const res = await listSuppliers({ page: 1, page_size: 1000 })
              return res.list
            }}
          />,
        ]}
        headerTitle="供应商列表"
      />
      <ModalForm<SupplierFormValues>
        title={editing ? '编辑供应商' : '新增供应商'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={720}
        grid
      >
        <ProFormText
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入供应商名称' }]}
          placeholder="供应商名称"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="supplier_no"
          label="编号"
          placeholder="供应商编号,留空自动生成"
          colProps={{ span: 12 }}
        />
        <ProFormText name="contact_person" label="联系人" colProps={{ span: 12 }} />
        <ProFormText name="phone" label="电话" colProps={{ span: 12 }} />
        <ProFormText name="email" label="邮箱" colProps={{ span: 12 }} />
        <ProFormText name="address" label="地址" colProps={{ span: 12 }} />
        <ProFormText name="bank_name" label="开户行" colProps={{ span: 12 }} />
        <ProFormText name="bank_account" label="银行账号" colProps={{ span: 12 }} />
        <ProFormRadio.Group
          name="status"
          label="状态"
          rules={[{ required: true, message: '请选择状态' }]}
          options={[
            { label: '启用', value: 1 },
            { label: '停用', value: 0 },
          ]}
          colProps={{ span: 12 }}
        />
        <ProFormTextArea name="remark" label="备注" colProps={{ span: 12 }} />
      </ModalForm>
    </>
  )
}
