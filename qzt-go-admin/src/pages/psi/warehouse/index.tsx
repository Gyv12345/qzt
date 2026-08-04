import { useRef, useState } from 'react'
import { App, Button, Form, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProForm,
  ProFormDigit,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import UserSelect from '../../../components/UserSelect'
import {
  createWarehouse,
  deleteWarehouse,
  listWarehouses,
  updateWarehouse,
} from '../../../services/psi'
import { useUserStore } from '../../../stores/users'
import type { PsiWarehouse, PsiWarehousePayload } from '../../../types/psi'

interface WarehouseFormValues {
  code: string
  name: string
  address?: string
  manager_id?: number
  phone?: string
  sort?: number
  status: number
  is_default: number
  remark?: string
}

export default function WarehousePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<WarehouseFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PsiWarehouse | null>(null)
  const nickname = useUserStore((s) => s.nickname)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: 1, is_default: 0, sort: 0 })
    setModalOpen(true)
  }

  const openEdit = (record: PsiWarehouse) => {
    setEditing(record)
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      address: record.address,
      manager_id: record.manager_id ?? undefined,
      phone: record.phone,
      sort: record.sort,
      status: record.status,
      is_default: record.is_default,
      remark: record.remark,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: WarehouseFormValues) => {
    const payload: PsiWarehousePayload = {
      code: values.code,
      name: values.name,
      address: values.address || undefined,
      manager_id: values.manager_id || undefined,
      phone: values.phone || undefined,
      sort: values.sort ?? 0,
      status: values.status,
      is_default: values.is_default,
      remark: values.remark || undefined,
    }
    if (editing) {
      await updateWarehouse(editing.id, payload)
      message.success('仓库已更新')
    } else {
      await createWarehouse(payload)
      message.success('仓库已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: PsiWarehouse) => {
    await deleteWarehouse(record.id)
    message.success('仓库已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<PsiWarehouse>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '编码', dataIndex: 'code', width: 120, search: false },
    { title: '名称', dataIndex: 'name', width: 160, search: false },
    { title: '地址', dataIndex: 'address', width: 200, search: false },
    {
      title: '负责人',
      dataIndex: 'manager_id',
      width: 110,
      search: false,
      render: (_, record) => nickname(record.manager_id),
    },
    { title: '电话', dataIndex: 'phone', width: 140, search: false },
    { title: '排序', dataIndex: 'sort', width: 70, search: false },
    {
      title: '是否默认',
      dataIndex: 'is_default',
      width: 90,
      search: false,
      render: (_, record) =>
        record.is_default === 1 ? <Tag color="green">是</Tag> : <Tag>否</Tag>,
    },
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
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '编码/名称' },
    },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="psi:warehouse:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="psi:warehouse:delete">
            <Popconfirm
              title="确认删除该仓库?"
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
      <ProTable<PsiWarehouse>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listWarehouses({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="psi:warehouse:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增仓库
            </Button>
          </Auth>,
        ]}
        headerTitle="仓库列表"
      />
      <ModalForm<WarehouseFormValues>
        title={editing ? '编辑仓库' : '新增仓库'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={720}
        grid
      >
        <ProFormText
          name="code"
          label="编码"
          rules={[{ required: true, message: '请输入仓库编码' }]}
          placeholder="如 WH001"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入仓库名称' }]}
          placeholder="仓库名称"
          colProps={{ span: 12 }}
        />
        <ProFormText name="address" label="地址" colProps={{ span: 12 }} />
        <ProForm.Item name="manager_id" label="负责人" colProps={{ span: 12 }}>
          <UserSelect placeholder="选择负责人" />
        </ProForm.Item>
        <ProFormText name="phone" label="电话" colProps={{ span: 12 }} />
        <ProFormDigit
          name="sort"
          label="排序"
          min={0}
          fieldProps={{ precision: 0 }}
          colProps={{ span: 12 }}
        />
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
        <ProFormRadio.Group
          name="is_default"
          label="是否默认"
          rules={[{ required: true, message: '请选择是否默认仓库' }]}
          options={[
            { label: '是', value: 1 },
            { label: '否', value: 0 },
          ]}
          colProps={{ span: 12 }}
        />
        <ProFormTextArea name="remark" label="备注" colProps={{ span: 12 }} />
      </ModalForm>
    </>
  )
}
