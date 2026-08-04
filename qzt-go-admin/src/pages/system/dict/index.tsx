import { useRef, useState } from 'react'
import { App, Button, Form, Input, InputNumber, Popconfirm, Space, Switch } from 'antd'
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import {
  ProForm,
  ModalForm,
  ProFormDigit,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { createDict, deleteDict, listDicts, updateDict } from '../../../services/system'
import type { SysDict } from '../../../types'

interface DictItemFormValues {
  label: string
  value: string
  sort?: number
  status: boolean
  remark?: string
}

interface DictFormValues {
  name: string
  code: string
  sort?: number
  status: boolean
  remark?: string
  items?: DictItemFormValues[]
}

export default function DictPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<DictFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SysDict | null>(null)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: true, items: [] } as Partial<DictFormValues>)
    setModalOpen(true)
  }

  const openEdit = (record: SysDict) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      sort: record.sort,
      status: record.status === 1,
      remark: record.remark,
      items:
        record.items?.map((item) => ({
          label: item.label,
          value: item.value,
          sort: item.sort,
          status: item.status === 1,
          remark: item.remark,
        })) ?? [],
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: DictFormValues) => {
    const payload = {
      name: values.name,
      code: values.code,
      sort: values.sort,
      status: values.status ? 1 : 0,
      remark: values.remark,
      items: (values.items ?? []).map((item) => ({
        label: item.label,
        value: item.value,
        sort: item.sort ?? 0,
        status: item.status ? 1 : 0,
        remark: item.remark,
      })),
    }
    if (editing) {
      await updateDict(editing.id, payload)
      message.success('字典已更新')
    } else {
      await createDict(payload)
      message.success('字典已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: SysDict) => {
    await deleteDict(record.id)
    message.success('字典已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<SysDict>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '字典名称', dataIndex: 'keyword', hideInTable: true },
    { title: '名称', dataIndex: 'name', width: 160, search: false },
    { title: '编码', dataIndex: 'code', width: 180, search: false },
    {
      title: '字典项',
      dataIndex: 'items',
      search: false,
      render: (_, r) => `${r.items?.length ?? 0} 项`,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      search: false,
      valueEnum: {
        1: { text: '正常', status: 'Success' },
        0: { text: '停用', status: 'Default' },
      },
    },
    { title: '排序', dataIndex: 'sort', width: 70, search: false },
    { title: '备注', dataIndex: 'remark', width: 200, ellipsis: true, search: false },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="system:dict:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="system:dict:delete">
            <Popconfirm
              title="确认删除该字典?"
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
      <ProTable<SysDict>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, keyword }) => {
          const res = await listDicts({ page: current, page_size: pageSize, keyword })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="system:dict:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增字典
            </Button>
          </Auth>,
        ]}
        headerTitle="字典列表"
      />
      <ModalForm<DictFormValues>
        title={editing ? '编辑字典' : '新增字典'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={760}
        grid
      >
        <ProFormText
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入字典名称' }]}
          placeholder="字典名称"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="code"
          label="编码"
          disabled={!!editing}
          rules={[{ required: true, message: '请输入字典编码' }]}
          placeholder="字典编码"
          colProps={{ span: 12 }}
        />
        <ProFormDigit
          name="sort"
          label="排序"
          min={0}
          fieldProps={{ precision: 0 }}
          colProps={{ span: 12 }}
        />
        <ProForm.Item name="status" label="状态" valuePropName="checked" colProps={{ span: 12 }}>
          <Switch checkedChildren="正常" unCheckedChildren="停用" />
        </ProForm.Item>
        <ProFormTextArea name="remark" label="备注" placeholder="备注" colProps={{ span: 24 }} />
        <ProForm.Item label="字典项" colProps={{ span: 24 }}>
          <Form.List name="items">
            {(fields, { add, remove }) => (
              <>
                {fields.map((field) => (
                  <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <ProForm.Item
                      name={[field.name, 'label']}
                      rules={[{ required: true, message: '请输入显示名' }]}
                      noStyle
                    >
                      <Input placeholder="显示名" style={{ width: 140 }} />
                    </ProForm.Item>
                    <ProForm.Item
                      name={[field.name, 'value']}
                      rules={[{ required: true, message: '请输入值' }]}
                      noStyle
                    >
                      <Input placeholder="值" style={{ width: 140 }} />
                    </ProForm.Item>
                    <ProForm.Item name={[field.name, 'sort']} noStyle>
                      <InputNumber placeholder="排序" style={{ width: 70 }} min={0} precision={0} />
                    </ProForm.Item>
                    <ProForm.Item name={[field.name, 'status']} valuePropName="checked" noStyle>
                      <Switch />
                    </ProForm.Item>
                    <ProForm.Item name={[field.name, 'remark']} noStyle>
                      <Input placeholder="备注" />
                    </ProForm.Item>
                    <MinusCircleOutlined onClick={() => remove(field.name)} />
                  </Space>
                ))}
                <ProForm.Item>
                  <Button
                    type="dashed"
                    block
                    icon={<PlusOutlined />}
                    onClick={() => add({ sort: 0, status: true })}
                  >
                    添加字典项
                  </Button>
                </ProForm.Item>
              </>
            )}
          </Form.List>
        </ProForm.Item>
      </ModalForm>
    </>
  )
}
