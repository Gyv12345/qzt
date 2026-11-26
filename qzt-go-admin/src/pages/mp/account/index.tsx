import { useRef, useState } from 'react'
import { App, Badge, Button, Form, Popconfirm, Radio, Switch, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import {
  DrawerForm,
  ProFormText,
  ProTable,
  type ActionType,
  type ProColumns,
} from '@ant-design/pro-components'
import dayjs from 'dayjs'
import Auth from '../../../components/Auth'
import {
  createAccount,
  deleteAccount,
  listAccounts,
  updateAccount,
  type MpAccountPayload,
} from '../../../services/mp'
import type { MpAccount } from '../../../types/mp'

interface AccountFormValues {
  name: string
  account_type: 'sub' | 'srv'
  app_id: string
  /** 编辑模式留空则不修改 */
  app_secret?: string
  /** Switch 布尔值,提交时转 1/0 */
  enabled: boolean
}

export default function MpAccountPage() {
  const { message } = App.useApp()
  const actionRef = useRef<ActionType>(null)
  const [form] = Form.useForm<AccountFormValues>()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<MpAccount | null>(null)

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ enabled: true })
    setDrawerOpen(true)
  }

  const openEdit = (record: MpAccount) => {
    setEditing(record)
    // app_secret 为脱敏值,编辑时不回填,留空则后端不修改
    form.setFieldsValue({
      name: record.name,
      account_type: record.account_type,
      app_id: record.app_id,
      app_secret: undefined,
      enabled: record.enabled === 1,
    })
    setDrawerOpen(true)
  }

  const handleSubmit = async (values: AccountFormValues) => {
    const payload: MpAccountPayload = {
      name: values.name,
      account_type: values.account_type,
      app_id: values.app_id,
      enabled: values.enabled ? 1 : 0,
      ...(values.app_secret ? { app_secret: values.app_secret } : {}),
    }
    if (editing) {
      await updateAccount(editing.id, payload)
      message.success('账号已更新')
    } else {
      await createAccount(payload)
      message.success('账号已创建')
    }
    actionRef.current?.reload()
    return true
  }

  const handleDelete = async (record: MpAccount) => {
    await deleteAccount(record.id)
    message.success('账号已删除')
    actionRef.current?.reload()
  }

  const columns: ProColumns<MpAccount>[] = [
    {
      title: '名称',
      dataIndex: 'name',
      search: false,
      width: 180,
    },
    {
      title: '类型',
      dataIndex: 'account_type',
      search: false,
      width: 100,
      render: (_, r) =>
        r.account_type === 'srv' ? <Tag color="blue">服务号</Tag> : <Tag>订阅号</Tag>,
    },
    {
      title: 'AppID',
      dataIndex: 'app_id',
      search: false,
      width: 200,
      render: (_, r) => <span style={{ fontFamily: 'monospace' }}>{r.app_id}</span>,
    },
    {
      title: 'AppSecret',
      dataIndex: 'app_secret',
      search: false,
      width: 160,
      render: (_, r) => <span style={{ fontFamily: 'monospace' }}>{r.app_secret || '-'}</span>,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      search: false,
      width: 90,
      render: (_, r) => (
        <Badge status={r.enabled === 1 ? 'success' : 'default'} text={r.enabled === 1 ? '启用' : '停用'} />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      valueType: 'dateTime',
      search: false,
      width: 170,
      render: (_, r) => (r.created_at ? dayjs(r.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
    {
      title: '操作',
      valueType: 'option',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <>
          <Auth perm="mp:account:edit">
            <Button type="link" size="small" onClick={() => openEdit(record)}>
              编辑
            </Button>
          </Auth>
          <Auth perm="mp:account:delete">
            <Popconfirm
              title="确认删除该公众号账号?"
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
        </>
      ),
    },
  ]

  return (
    <>
      <ProTable<MpAccount>
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        scroll={{ x: 'max-content' }}
        request={async () => {
          const list = await listAccounts()
          return { data: list, total: list.length, success: true }
        }}
        pagination={false}
        toolBarRender={() => [
          <Auth perm="mp:account:add" key="add">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              新建账号
            </Button>
          </Auth>,
        ]}
        headerTitle="公众号账号"
      />
      <DrawerForm<AccountFormValues>
        title={editing ? '编辑公众号账号' : '新建公众号账号'}
        form={form}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        drawerProps={{ destroyOnHidden: true, maskClosable: false }}
        onFinish={handleSubmit}
        width={560}
      >
        <ProFormText
          name="name"
          label="名称"
          rules={[{ required: true, message: '请输入账号名称' }]}
          placeholder="公众号名称,仅后台展示用"
        />
        <Form.Item name="account_type" label="类型" initialValue="sub" rules={[{ required: true }]}>
          <Radio.Group
            options={[
              { label: '订阅号', value: 'sub' },
              { label: '服务号', value: 'srv' },
            ]}
          />
        </Form.Item>
        <ProFormText
          name="app_id"
          label="AppID"
          rules={[{ required: true, message: '请输入 AppID' }]}
          placeholder="微信公众平台开发者 ID"
        />
        <ProFormText
          name="app_secret"
          label="AppSecret"
          rules={editing ? [] : [{ required: true, message: '请输入 AppSecret' }]}
          placeholder={editing ? '留空则不修改' : '微信公众平台开发者密码'}
        />
        <Form.Item name="enabled" label="启用" valuePropName="checked">
          <Switch checkedChildren="启用" unCheckedChildren="停用" />
        </Form.Item>
      </DrawerForm>
    </>
  )
}
