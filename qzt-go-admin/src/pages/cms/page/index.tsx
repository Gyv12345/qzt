import { useRef, useState } from 'react'
import { App, Button, Col, Form, Popconfirm, Space } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  DrawerForm,
  ProForm,
  ProFormDigit,
  ProFormRadio,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import MarkdownEditor from '../../../components/MarkdownEditor'
import { createPage, deletePage, listPages, updatePage } from '../../../services/cms'
import type { CmsPage, CmsPagePayload } from '../../../types/cms'

interface PageFormValues {
  title: string
  slug: string
  content?: string
  status: number
  sort?: number
}

export default function CmsPagePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<PageFormValues>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<CmsPage | null>(null)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: 1 } as Partial<PageFormValues>)
    setDrawerOpen(true)
  }

  const openEdit = (record: CmsPage) => {
    setEditing(record)
    form.setFieldsValue({
      title: record.title,
      slug: record.slug,
      content: record.content,
      status: record.status,
      sort: record.sort,
    })
    setDrawerOpen(true)
  }

  const handleSubmit = async (values: PageFormValues) => {
    const payload: CmsPagePayload = {
      title: values.title,
      slug: values.slug,
      content: values.content,
      status: values.status,
      sort: values.sort,
    }
    if (editing) {
      await updatePage(editing.id, payload)
      message.success('单页已更新')
    } else {
      await createPage(payload)
      message.success('单页已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: CmsPage) => {
    await deletePage(record.id)
    message.success('单页已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<CmsPage>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '标题/别名', dataIndex: 'keyword', hideInTable: true },
    { title: '标题', dataIndex: 'title', width: 240, search: false },
    { title: '别名', dataIndex: 'slug', width: 160, copyable: true, search: false },
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
    { title: '排序', dataIndex: 'sort', width: 70, search: false },
    { title: '更新时间', dataIndex: 'updated_at', valueType: 'dateTime', width: 170, search: false },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="cms:page:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="cms:page:delete">
            <Popconfirm
              title="确认删除该单页?"
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
      <ProTable<CmsPage>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listPages({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="cms:page:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增单页
            </Button>
          </Auth>,
        ]}
        headerTitle="单页列表"
      />
      <DrawerForm<PageFormValues>
        title={editing ? '编辑单页' : '新增单页'}
        form={form}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        drawerProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={720}
        grid
      >
        <ProFormText
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入标题' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="slug"
          label="别名"
          rules={[{ required: true, message: '请输入别名' }]}
          placeholder="英文别名,访问路径用"
          colProps={{ span: 12 }}
        />
        <Col span={24}>
          <ProForm.Item name="content" label="内容">
            <MarkdownEditor height={420} placeholder="支持 Markdown 语法(标题/表格/图片/代码块等)" />
          </ProForm.Item>
        </Col>
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
        <ProFormDigit
          name="sort"
          label="排序"
          min={0}
          fieldProps={{ precision: 0 }}
          colProps={{ span: 12 }}
        />
      </DrawerForm>
    </>
  )
}
