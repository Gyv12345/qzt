import { useRef, useState } from 'react'
import { App, Button, Col, Form, Popconfirm, Select, Space, Tag, Switch } from 'antd'
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
import {
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  setWebhookStatus,
  listOpenEvents,
} from '../../../services/open'
import type { OpenWebhook, OpenEventInfo } from '../../../types/open'
import { pageIndexColumn } from '../../../components/IndexTag'

interface WebhookFormValues {
  name: string
  url: string
  events: string[]
  remark?: string
}

export default function WebhookPage() {
  const { message, modal } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<WebhookFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<OpenWebhook | null>(null)
  // 事件目录(来自 /open/v1/events)
  const [events, setEvents] = useState<OpenEventInfo[]>([])

  const loadEvents = async () => {
    try {
      const list = await listOpenEvents()
      setEvents(list ?? [])
    } catch {
      // 目录加载失败不阻断页面,表单事件下拉为空
    }
  }

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    if (events.length === 0) void loadEvents()
    setModalOpen(true)
  }

  const openEdit = (record: OpenWebhook) => {
    setEditing(record)
    form.setFieldsValue({
      name: record.name,
      url: record.url,
      events: record.events ? record.events.split(',') : [],
      remark: record.remark,
    })
    if (events.length === 0) void loadEvents()
    setModalOpen(true)
  }

  const handleSubmit = async (values: WebhookFormValues) => {
    const payload = {
      name: values.name,
      url: values.url,
      events: (values.events ?? []).join(','),
      remark: values.remark,
    }
    if (editing) {
      await updateWebhook(editing.id, payload)
      message.success('Webhook 已更新')
    } else {
      const res = await createWebhook(payload)
      modal.info({
        title: 'Webhook 已创建',
        content: (
          <div>
            <p>签名密钥仅展示一次,请妥善保存:</p>
            <code style={{ wordBreak: 'break-all' }}>{res?.secret}</code>
          </div>
        ),
      })
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: OpenWebhook) => {
    await deleteWebhook(record.id)
    message.success('Webhook 已删除')
    actionRef.current?.reload()
  }

  const handleToggle = async (record: OpenWebhook, status: number) => {
    await setWebhookStatus(record.id, status)
    message.success(status === 1 ? '已启用' : '已停用')
    actionRef.current?.reload()
  }

  const columns: ProColumns<OpenWebhook>[] = [
    pageIndexColumn(actionRef),
    { title: '名称', dataIndex: 'name', width: 160 },
    { title: '目标 URL', dataIndex: 'url', width: 300, ellipsis: true },
    {
      title: '订阅事件',
      dataIndex: 'events',
      width: 240,
      render: (_, r) =>
        r.events
          ? r.events.split(',').map((e) => <Tag key={e} color="blue">{e}</Tag>)
          : <Tag color="purple">全部事件</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (_, r) => (
        <Auth perm="open:webhook:status">
          <Switch
            checked={r.status === 1}
            onChange={(checked) => handleToggle(r, checked ? 1 : 0)}
          />
        </Auth>
      ),
    },
    { title: '备注', dataIndex: 'remark', width: 180, ellipsis: true, render: (_, r) => r.remark || '-' },
    { title: '创建时间', dataIndex: 'created_at', valueType: 'dateTime', width: 170 },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="open:webhook:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="open:webhook:delete">
            <Popconfirm
              title="确认删除该 Webhook?"
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
      <ProTable<OpenWebhook>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        request={async () => {
          const res = await listWebhooks()
          return { data: res?.list ?? [], total: res?.total ?? 0, success: true }
        }}
        pagination={false}
        toolBarRender={() => [
          <Auth perm="open:webhook:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增 Webhook
            </Button>
          </Auth>,
        ]}
        headerTitle="Webhook 订阅"
      />
      <ModalForm<WebhookFormValues>
        title={editing ? '编辑 Webhook' : '新增 Webhook'}
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
          rules={[{ required: true, message: '请输入名称' }]}
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="url"
          label="目标 URL"
          rules={[
            { required: true, message: '请输入投递目标 URL' },
            { type: 'url', message: 'URL 格式不正确' },
          ]}
          placeholder="https://oa.example.com/webhook/qzt"
          colProps={{ span: 12 }}
        />
        <Col span={24}>
          <ProForm.Item
            name="events"
            label="订阅事件"
            extra="留空=订阅全部事件;选项来自开放事件目录"
          >
            <Select
              mode="multiple"
              allowClear
              placeholder="选择要订阅的事件"
              options={events.map((e) => ({ label: `${e.name}(${e.code})`, value: e.code }))}
            />
          </ProForm.Item>
        </Col>
        <Col span={24}>
          <ProFormTextArea name="remark" label="备注" placeholder="选填" rows={2} />
        </Col>
      </ModalForm>
    </>
  )
}