import { useRef, useState } from 'react'
import { App, Button, Form, Input, Popconfirm, Select, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ProForm,
  ModalForm,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { createApi, deleteApi, listApis, updateApi } from '../../../services/system'
import type { SysAPI } from '../../../types'

interface ApiFormValues {
  path: string
  method: string
  group: string
  description?: string
}

const methodColors: Record<string, string> = {
  GET: 'green',
  POST: 'geekblue',
  PUT: 'orange',
  DELETE: 'red',
  PATCH: 'purple',
}

const methodOptions = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map((m) => ({
  label: m,
  value: m,
}))

export default function ApiPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<ApiFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SysAPI | null>(null)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: SysAPI) => {
    setEditing(record)
    form.setFieldsValue({
      path: record.path,
      method: record.method,
      group: record.group,
      description: record.description,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: ApiFormValues) => {
    const payload = {
      path: values.path,
      method: values.method,
      group: values.group,
      description: values.description,
    }
    if (editing) {
      await updateApi(editing.id, payload)
      message.success('接口已更新')
    } else {
      await createApi(payload)
      message.success('接口已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: SysAPI) => {
    await deleteApi(record.id)
    message.success('接口已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<SysAPI>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70 },
    {
      title: '请求方式',
      dataIndex: 'method',
      width: 90,
      render: (_, r) => <Tag color={methodColors[r.method] ?? 'default'}>{r.method}</Tag>,
    },
    { title: '接口路径', dataIndex: 'path', width: 280 },
    {
      title: '分组',
      dataIndex: 'group',
      width: 120,
      render: (_, r) => <Tag>{r.group}</Tag>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 220,
      ellipsis: true,
      render: (_, r) => r.description || '-',
    },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="system:api:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="system:api:delete">
            <Popconfirm
              title="确认删除该接口?"
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
      <ProTable<SysAPI>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        request={async ({ current, pageSize }) => {
          const res = await listApis({ page: current, page_size: pageSize })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="system:api:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增接口
            </Button>
          </Auth>,
        ]}
        headerTitle="接口列表"
      />
      <ModalForm<ApiFormValues>
        title={editing ? '编辑接口' : '新增接口'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <ProFormText
          name="path"
          label="接口路径"
          rules={[{ required: true, message: '请输入接口路径' }]}
          placeholder="如 /system/users"
          colProps={{ span: 12 }}
        />
        <ProForm.Item
          name="method"
          label="请求方式"
          rules={[{ required: true, message: '请选择请求方式' }]}
          colProps={{ span: 12 }}
        >
          <Select placeholder="选择请求方式" options={methodOptions} />
        </ProForm.Item>
        <ProFormText
          name="group"
          label="分组"
          rules={[{ required: true, message: '请输入分组' }]}
          placeholder="如 用户管理"
          colProps={{ span: 12 }}
        />
        <ProForm.Item name="description" label="描述" colProps={{ span: 24 }}>
          <Input.TextArea rows={3} placeholder="接口描述(选填)" />
        </ProForm.Item>
      </ModalForm>
    </>
  )
}
