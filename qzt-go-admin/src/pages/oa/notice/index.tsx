import { useRef, useState } from 'react'
import { App, Button, Form, Modal, Popconfirm, Space } from 'antd'
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
import {
  createNotice,
  deleteNotice,
  listNotices,
  publishNotice,
  updateNotice,
  withdrawNotice,
} from '../../../services/oa'
import type { OaNotice } from '../../../types/oa'

interface NoticeFormValues {
  title: string
  type: number
  content?: string
}

export default function NoticePage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<NoticeFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<OaNotice | null>(null)
  const [previewing, setPreviewing] = useState<OaNotice | null>(null)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ type: 1 })
    setModalOpen(true)
  }

  const openEdit = (record: OaNotice) => {
    setEditing(record)
    form.setFieldsValue({
      title: record.title,
      type: record.type,
      content: record.content,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: NoticeFormValues) => {
    const payload = {
      title: values.title,
      type: values.type,
      content: values.content || undefined,
    }
    if (editing) {
      await updateNotice(editing.id, payload)
      message.success('公告已更新')
    } else {
      await createNotice(payload)
      message.success('公告已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handlePublish = async (record: OaNotice) => {
    await publishNotice(record.id)
    message.success('公告已发布')
    actionRef.current?.reload()
  }

  const handleWithdraw = async (record: OaNotice) => {
    await withdrawNotice(record.id)
    message.success('公告已撤回')
    actionRef.current?.reload()
  }

  const handleDelete = async (record: OaNotice) => {
    await deleteNotice(record.id)
    message.success('公告已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<OaNotice>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    { title: '标题', dataIndex: 'title', width: 240, ellipsis: true },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
      valueType: 'select',
      valueEnum: {
        1: { text: '通知' },
        2: { text: '公告' },
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      search: false,
      valueEnum: {
        0: { text: '草稿', status: 'Default' },
        1: { text: '发布', status: 'Success' },
      },
    },
    {
      title: '发布时间',
      dataIndex: 'publish_time',
      valueType: 'dateTime',
      width: 170,
      search: false,
      render: (_, record) => record.publish_time ?? '-',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 240,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => setPreviewing(record)}>
            预览
          </Button>
          <Auth perm="oa:notice:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          {record.status === 0 && (
            <Auth perm="oa:notice:publish">
              <Popconfirm
                title="确认发布该公告?"
                okText="发布"
                cancelText="取消"
                onConfirm={() => handlePublish(record)}
              >
                <Button type="link" size="small">
                  发布
                </Button>
              </Popconfirm>
            </Auth>
          )}
          {record.status === 1 && (
            <Auth perm="oa:notice:publish">
              <Popconfirm
                title="确认撤回该公告?"
                okText="撤回"
                cancelText="取消"
                onConfirm={() => handleWithdraw(record)}
              >
                <Button type="link" size="small">
                  撤回
                </Button>
              </Popconfirm>
            </Auth>
          )}
          <Auth perm="oa:notice:delete">
            <Popconfirm
              title="确认删除该公告?"
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
      <ProTable<OaNotice>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async ({ current, pageSize, ...rest }) => {
          const res = await listNotices({ page: current, page_size: pageSize, ...rest })
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        toolBarRender={() => [
          <Auth perm="oa:notice:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增公告
            </Button>
          </Auth>,
        ]}
        headerTitle="公告管理"
      />
      <ModalForm<NoticeFormValues>
        title={editing ? '编辑公告' : '新增公告'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <ProFormText
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入标题' }]}
          placeholder="公告标题"
          colProps={{ span: 12 }}
        />
        <ProFormRadio.Group
          name="type"
          label="类型"
          rules={[{ required: true, message: '请选择类型' }]}
          options={[
            { label: '通知', value: 1 },
            { label: '公告', value: 2 },
          ]}
          colProps={{ span: 12 }}
        />
        <ProFormTextArea
          name="content"
          label="内容"
          placeholder="公告内容"
          fieldProps={{ rows: 6 }}
          colProps={{ span: 24 }}
        />
      </ModalForm>
      <Modal
        title="公告预览"
        open={!!previewing}
        onCancel={() => setPreviewing(null)}
        footer={null}
        width={640}
        destroyOnHidden
      >
        {previewing && (
          <>
            <h3>{previewing.title}</h3>
            <div style={{ whiteSpace: 'pre-wrap' }}>{previewing.content}</div>
          </>
        )}
      </Modal>
    </>
  )
}
