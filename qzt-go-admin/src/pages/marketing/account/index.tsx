import { useRef, useState } from 'react'
import { Alert, App, Button, Form, Input, Popconfirm, Space, Switch, Tag } from 'antd'
import { LinkOutlined, PlusOutlined, SyncOutlined } from '@ant-design/icons'
import {
  ModalForm,
  ProForm,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import {
  createAccount,
  deleteAccount,
  getAuthorizeUrl,
  listAccounts,
  syncAccount,
  updateAccount,
} from '../../../services/marketing'
import type { MarketingAccount, MarketingAccountPayload } from '../../../types/marketing'

/** 巨量 OAuth 回调地址:按当前后台域名推导(私有化部署不写死域名) */
const callbackUrl = `${window.location.origin}/prod-api/marketing/oauth/callback`

const STATUS_ENUM = {
  0: { text: '待授权', status: 'Default' },
  1: { text: '已授权', status: 'Success' },
  2: { text: '授权失效', status: 'Error' },
} as const

interface AccountFormValues {
  name: string
  app_id: string
  app_secret?: string
}

export default function MarketingAccountPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<MarketingAccount | null>(null)
  const [syncingId, setSyncingId] = useState<number | null>(null)
  const [form] = Form.useForm<AccountFormValues>()

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record: MarketingAccount) => {
    setEditing(record)
    form.setFieldsValue({ name: record.name, app_id: record.app_id, app_secret: '' })
    setModalOpen(true)
  }

  const handleSubmit = async (values: AccountFormValues) => {
    const payload: MarketingAccountPayload = {
      name: values.name,
      app_id: values.app_id,
      app_secret: values.app_secret || undefined,
    }
    if (editing) {
      await updateAccount(editing.id, payload)
      message.success('账号已保存')
    } else {
      await createAccount(payload)
      message.success('账号已创建,请完成授权')
    }
    actionRef.current?.reload()
    return true
  }

  /** 打开巨量授权页(新标签),授权完成后回来自动刷新状态 */
  const handleAuthorize = async (record: MarketingAccount) => {
    const { url } = await getAuthorizeUrl(record.id, callbackUrl)
    window.open(url, '_blank')
    message.info('已在新窗口打开巨量授权页,完成授权后请回到本页刷新查看状态')
  }

  const handleSync = async (record: MarketingAccount) => {
    setSyncingId(record.id)
    try {
      const res = await syncAccount(record.id)
      message.success(`同步完成:新增 ${res.inserted} 条,重复跳过 ${res.skipped} 条,失败 ${res.failed} 条`)
      actionRef.current?.reload()
    } finally {
      setSyncingId(null)
    }
  }

  const handleToggleEnabled = async (record: MarketingAccount, enabled: boolean) => {
    await updateAccount(record.id, {
      name: record.name,
      app_id: record.app_id,
      enabled: enabled ? 1 : 0,
    })
    message.success(enabled ? '已启用,定时任务将同步该账号线索' : '已停用,定时任务跳过该账号')
    actionRef.current?.reload()
  }

  const handleDelete = async (record: MarketingAccount) => {
    await deleteAccount(record.id)
    message.success('账号已删除,历史同步日志保留')
    actionRef.current?.reload()
  }

  const columns: ProColumns<MarketingAccount>[] = [
    { title: '序号', valueType: 'indexBorder', width: 70, search: false },
    { title: '账号名称', dataIndex: 'name', search: false, width: 140 },
    {
      title: '渠道',
      dataIndex: 'channel',
      search: false,
      width: 100,
      render: () => <Tag color="red">抖音·巨量引擎</Tag>,
    },
    { title: '应用 ID', dataIndex: 'app_id', search: false, width: 150, ellipsis: true },
    {
      title: '授权状态',
      dataIndex: 'status',
      search: false,
      width: 100,
      valueEnum: STATUS_ENUM,
    },
    {
      title: '广告主账户',
      dataIndex: 'advertiser_ids',
      search: false,
      ellipsis: true,
      render: (_, r) => r.advertiser_ids || '-',
    },
    {
      title: '最近同步',
      dataIndex: 'last_sync_at',
      search: false,
      width: 160,
      render: (_, r) => r.last_sync_at || '未同步',
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      search: false,
      width: 80,
      render: (_, r) => (
        <Switch
          checked={r.enabled === 1}
          size="small"
          onChange={(checked) => handleToggleEnabled(r, checked)}
        />
      ),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 230,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0} wrap>
          <Auth perm="marketing:account:authorize">
            <Button
              type="link"
              size="small"
              icon={<LinkOutlined />}
              onClick={() => handleAuthorize(record)}
            >
              {record.status === 1 ? '重新授权' : '授权'}
            </Button>
          </Auth>
          {record.status === 1 && (
            <Auth perm="marketing:account:sync">
              <Button
                type="link"
                size="small"
                icon={<SyncOutlined />}
                loading={syncingId === record.id}
                onClick={() => handleSync(record)}
              >
                同步
              </Button>
            </Auth>
          )}
          <Auth perm="marketing:account:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="marketing:account:delete">
            <Popconfirm
              title="确认删除该账号?"
              description="删除后停止同步,历史同步日志保留"
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
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="抖音广告线索自动入库"
        description={
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            接入步骤:① 在<b>巨量引擎商业开放平台</b>(open.oceanengine.com)注册开发者并创建「自用型」应用,申请<b>飞鱼线索管理</b>接口权限;
            ② 在开放平台应用的「授权回调域」中登记 <code>{window.location.host}</code>;
            ③ 此处新增账号填入应用 ID 与 Secret,点击「授权」用广告账户完成扫码授权。
            授权后系统每 15 分钟自动拉取广告线索,去重后放入 <b>CRM 线索公海</b>,并通知管理员。
            本系统的回调地址为 <code>{callbackUrl}</code>
          </div>
        }
      />

      <ProTable<MarketingAccount>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 'max-content' }}
        search={false}
        request={async () => {
          const res = await listAccounts()
          return { data: res.list, total: res.total, success: true }
        }}
        pagination={false}
        toolBarRender={() => [
          <Auth perm="marketing:account:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新增渠道账号
            </Button>
          </Auth>,
        ]}
        headerTitle="渠道账号"
      />

      <ModalForm<AccountFormValues>
        title={editing ? '编辑渠道账号' : '新增渠道账号'}
        open={modalOpen}
        form={form}
        onOpenChange={setModalOpen}
        onFinish={handleSubmit}
        modalProps={{ destroyOnHidden: true }}
        width={480}
      >
        <ProFormText
          name="name"
          label="账号名称"
          placeholder="如 公司主广告账户"
          rules={[{ required: true, message: '请输入账号名称' }]}
        />
        <ProFormText
          name="app_id"
          label="应用 ID"
          placeholder="巨量引擎开放平台 → 应用管理 → App ID"
          rules={[{ required: true, message: '请输入应用 ID' }]}
        />
        <ProForm.Item
          name="app_secret"
          label="应用 Secret"
          rules={editing ? [] : [{ required: true, message: '请输入应用 Secret' }]}
        >
          <Input.Password
            placeholder={editing ? '留空表示不修改' : '巨量引擎开放平台 → 应用管理 → Secret'}
            autoComplete="new-password"
          />
        </ProForm.Item>
      </ModalForm>
    </>
  )
}
