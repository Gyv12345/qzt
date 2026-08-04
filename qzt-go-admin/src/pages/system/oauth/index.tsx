import { useRef, useState } from 'react'
import { App, Button, Form, Popconfirm, Space, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import {
  createOauthConfig,
  deleteOauthConfig,
  listOauthConfigs,
  setOauthConfigEnable,
  updateOauthConfig,
} from '../../../services/system'
import type { OauthConfigPayload, SysOauthConfig } from '../../../types'

interface OauthFormValues {
  provider: string
  name?: string
  app_id?: string
  app_secret?: string
  agent_id?: string
  redirect_uri?: string
  sort?: number
  extra?: string
  remark?: string
}

const PROVIDER_OPTIONS = [{ label: '企业微信', value: 'wecom' }]

const providerTag = (provider: string) => {
  const map: Record<string, { label: string; color: string }> = {
    wecom: { label: '企业微信', color: 'blue' },
  }
  const item = map[provider] ?? { label: provider, color: 'default' }
  return <Tag color={item.color}>{item.label}</Tag>
}

export default function OauthConfigPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<OauthFormValues>()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SysOauthConfig | null>(null)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ provider: 'wecom', sort: 0 })
    setModalOpen(true)
  }

  const openEdit = (record: SysOauthConfig) => {
    setEditing(record)
    form.setFieldsValue({
      provider: record.provider,
      name: record.name,
      app_id: record.app_id,
      app_secret: record.app_secret,
      agent_id: record.agent_id,
      redirect_uri: record.redirect_uri,
      sort: record.sort,
      extra: record.extra,
      remark: record.remark,
    })
    setModalOpen(true)
  }

  const handleSubmit = async (values: OauthFormValues) => {
    const payload: OauthConfigPayload = {
      provider: values.provider,
      name: values.name || undefined,
      app_id: values.app_id || undefined,
      app_secret: values.app_secret || undefined,
      agent_id: values.agent_id || undefined,
      redirect_uri: values.redirect_uri || undefined,
      sort: values.sort ?? 0,
      extra: values.extra || undefined,
      remark: values.remark || undefined,
    }
    if (editing) {
      await updateOauthConfig(editing.id, payload)
      message.success('配置已更新')
    } else {
      await createOauthConfig(payload)
      message.success('配置已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleToggleEnable = async (record: SysOauthConfig) => {
    await setOauthConfigEnable(record.id, record.status === 1 ? 0 : 1)
    message.success(record.status === 1 ? '已禁用' : '已启用')
    actionRef.current?.reload()
  }

  const handleDelete = async (record: SysOauthConfig) => {
    await deleteOauthConfig(record.id)
    message.success('配置已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<SysOauthConfig>[] = [
    { title: '编号', valueType: 'indexBorder', width: 70, search: false },
    {
      title: '提供方',
      dataIndex: 'provider',
      width: 100,
      search: false,
      render: (_, record) => providerTag(record.provider),
    },
    { title: '名称', dataIndex: 'name', width: 140, search: false },
    { title: 'AppID', dataIndex: 'app_id', width: 180, search: false, ellipsis: true },
    { title: 'AgentID', dataIndex: 'agent_id', width: 110, search: false },
    {
      title: '回调地址',
      dataIndex: 'redirect_uri',
      width: 220,
      search: false,
      ellipsis: true,
    },
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
    { title: '备注', dataIndex: 'remark', width: 160, search: false, ellipsis: true },
    {
      title: '操作',
      valueType: 'option',
      width: 170,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Auth perm="system:oauth:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="system:oauth:enable">
            <Button type="link" size="small" onClick={() => handleToggleEnable(record)}>
              {record.status === 1 ? '禁用' : '启用'}
            </Button>
          </Auth>
          <Auth perm="system:oauth:delete">
            <Popconfirm
              title="确认删除该配置?"
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
      <ProTable<SysOauthConfig>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        request={async () => {
          const res = await listOauthConfigs()
          return { data: res, total: res.length, success: true }
        }}
        pagination={false}
        toolBarRender={() => [
          <Auth perm="system:oauth:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增配置
            </Button>
          </Auth>,
        ]}
        headerTitle="第三方登录配置"
      />
      <ModalForm<OauthFormValues>
        title={editing ? '编辑配置' : '新增配置'}
        form={form}
        open={modalOpen}
        onOpenChange={setModalOpen}
        modalProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={640}
        grid
      >
        <ProFormSelect
          name="provider"
          label="提供方"
          rules={[{ required: true, message: '请选择提供方' }]}
          options={PROVIDER_OPTIONS}
          placeholder="请选择提供方"
          showSearch
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="name"
          label="名称"
          placeholder="如 企业微信登录"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="app_id"
          label="AppID"
          placeholder="企业微信 CorpID / AppID"
          colProps={{ span: 12 }}
        />
        <ProFormText.Password
          name="app_secret"
          label="App Secret"
          placeholder="留空表示不修改"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="agent_id"
          label="AgentID"
          placeholder="应用 AgentID"
          colProps={{ span: 12 }}
        />
        <ProFormText
          name="redirect_uri"
          label="回调地址"
          placeholder="如 https://example.com/login/oauth/callback"
          colProps={{ span: 12 }}
        />
        <ProFormDigit
          name="sort"
          label="排序"
          min={0}
          fieldProps={{ precision: 0 }}
          colProps={{ span: 12 }}
        />
        <ProFormTextArea
          name="extra"
          label="扩展配置"
          placeholder="JSON 格式的扩展配置,可选"
          colProps={{ span: 12 }}
        />
        <ProFormTextArea
          name="remark"
          label="备注"
          placeholder="备注信息"
          colProps={{ span: 12 }}
        />
      </ModalForm>
    </>
  )
}
