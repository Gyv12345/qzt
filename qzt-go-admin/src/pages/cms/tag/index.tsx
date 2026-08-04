import { useRef, useState } from 'react'
import { App, Button, Form, Popconfirm, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProFormDigit,
  ProFormRadio,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { createTag, deleteTag, listTags, updateTag } from '../../../services/cms'
import type { CmsTag } from '../../../types/cms'

interface TagFormValues {
  name: string
  slug?: string
  sort?: number
  status: number
}

export default function TagPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<TagFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<CmsTag | null>(null)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: 1, sort: 0 })
    setModalOpen(true)
  }

  const openEdit = (record: CmsTag) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      slug: record.slug,
      sort: record.sort,
      status: record.status,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: TagFormValues) => {
    const payload = {
      name: values.name,
      slug: values.slug || undefined,
      sort: values.sort ?? 0,
      status: values.status,
    }
    if (editing) {
      await updateTag(editing.id, payload)
      message.success('标签已更新')
    } else {
      await createTag(payload)
      message.success('标签已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: CmsTag) => {
    await deleteTag(record.id)
    message.success('标签已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<CmsTag>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '名称', dataIndex: 'name', width: 180, search: false },
    { title: '别名', dataIndex: 'slug', width: 160, search: false },
    { title: '排序', dataIndex: 'sort', width: 70, search: false },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      search: false,
      valueEnum: {
        1: { text: '启用', status: 'Success' },
        0: { text: '禁用', status: 'Default' },
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
      title: '名称/别名',
      dataIndex: 'keyword',
      hideInTable: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="cms:tag:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="cms:tag:delete">
            <Popconfirm
              title="确认删除该标签?"
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
      <ProTable<CmsTag>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listTags({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="cms:tag:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增标签
            </Button>
          </Auth>,
        ]}
        headerTitle="标签列表"
      />
      <ModalForm<TagFormValues>
        title={editing ? '编辑标签' : '新增标签'}
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
          label="名称"
          rules={[{ required: true, message: '请输入标签名称' }]}
          placeholder="如 热门推荐"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="slug"
          label="别名"
          placeholder="英文别名,留空自动生成"
          colProps={{ span: 12 }}
        />
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
            { label: '禁用', value: 0 },
          ]}
          colProps={{ span: 12 }}
        />
      </ModalForm>
    </>
  )
}
