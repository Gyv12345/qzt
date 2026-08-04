import { KeyOutlined, QrcodeOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  Alert,
  Avatar,
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { ModalForm, ProFormText } from '@ant-design/pro-components'
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import {
  changePassword,
  createApiKey,
  deleteApiKey,
  disableApiKey,
  fetchUserInfo,
  getWecomBindQrcode,
  listApiKeys,
  logout,
  unbindWecom,
  updateProfile,
} from '../../services/auth'
import type { CreateApiKeyResult, SysApiKey, UpdateProfileRequest } from '../../types'

interface ProfileCenterProps {
  open: boolean
  onClose: () => void
}

/** 基本信息 */
function BasicInfoTab() {
  const profile = useAuthStore((s) => s.profile)
  const [form] = Form.useForm<UpdateProfileRequest>()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    form.setFieldsValue({
      nickname: profile?.nickname,
      email: profile?.email,
      phone: profile?.phone,
      avatar: profile?.avatar,
    })
  }, [form, profile])

  const avatarUrl = Form.useWatch('avatar', form)

  const onFinish = async (values: UpdateProfileRequest) => {
    setSaving(true)
    try {
      await updateProfile(values)
      await fetchUserInfo()
      message.success('个人信息已更新')
    } catch {
      // 错误已由拦截器提示
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Avatar size={72} src={avatarUrl || profile?.avatar || undefined}>
          {profile?.nickname?.[0] || profile?.username?.[0]}
        </Avatar>
      </div>
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item name="nickname" label="昵称">
          <Input placeholder="请输入昵称" maxLength={32} />
        </Form.Item>
        <Form.Item name="email" label="邮箱" rules={[{ type: 'email', message: '邮箱格式不正确' }]}>
          <Input placeholder="请输入邮箱" />
        </Form.Item>
        <Form.Item name="phone" label="手机">
          <Input placeholder="请输入手机号" maxLength={20} />
        </Form.Item>
        <Form.Item name="avatar" label="头像 URL">
          <Input placeholder="请输入头像图片地址" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving} block>
          保存
        </Button>
      </Form>
    </div>
  )
}

/** 修改密码(成功后全部会话失效,强制重新登录) */
function PasswordTab({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const [form] = Form.useForm<{ old_password: string; new_password: string; confirm: string }>()
  const [saving, setSaving] = useState(false)

  const onFinish = async (values: { old_password: string; new_password: string }) => {
    setSaving(true)
    try {
      await changePassword({ old_password: values.old_password, new_password: values.new_password })
      message.success('密码已修改,请重新登录')
      onClose()
      await logout()
      navigate('/login', { replace: true })
    } catch {
      // 错误已由拦截器提示
    } finally {
      setSaving(false)
    }
  }

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item
        name="old_password"
        label="旧密码"
        rules={[{ required: true, message: '请输入旧密码' }]}
      >
        <Input.Password placeholder="请输入旧密码" />
      </Form.Item>
      <Form.Item
        name="new_password"
        label="新密码"
        rules={[
          { required: true, message: '请输入新密码' },
          { min: 6, message: '新密码至少 6 位' },
        ]}
      >
        <Input.Password placeholder="至少 6 位" />
      </Form.Item>
      <Form.Item
        name="confirm"
        label="确认新密码"
        dependencies={['new_password']}
        rules={[
          { required: true, message: '请再次输入新密码' },
          ({ getFieldValue }) => ({
            validator: (_, value) =>
              !value || value === getFieldValue('new_password')
                ? Promise.resolve()
                : Promise.reject(new Error('两次输入的密码不一致')),
          }),
        ]}
      >
        <Input.Password placeholder="请再次输入新密码" />
      </Form.Item>
      <Button type="primary" htmlType="submit" loading={saving} block>
        修改密码
      </Button>
    </Form>
  )
}

/** 企业微信绑定 */
function WecomTab() {
  const profile = useAuthStore((s) => s.profile)
  const [qrUrl, setQrUrl] = useState('')
  const [qrError, setQrError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const bound = !!profile?.wecom_user_id

  const loadQrcode = async () => {
    setLoading(true)
    setQrError('')
    try {
      const res = await getWecomBindQrcode()
      setQrUrl(res.url)
    } catch (e) {
      // 拦截器已 message.error,这里展示空态说明
      setQrUrl('')
      setQrError(e instanceof Error ? e.message : '获取绑定二维码失败')
    } finally {
      setLoading(false)
    }
  }

  const refreshBindStatus = async () => {
    setRefreshing(true)
    try {
      await fetchUserInfo()
      message.success('绑定状态已刷新')
    } catch {
      // 忽略
    } finally {
      setRefreshing(false)
    }
  }

  const onUnbind = async () => {
    await unbindWecom()
    await fetchUserInfo()
    message.success('已解绑企业微信')
  }

  if (bound) {
    return (
      <div>
        <Alert type="success" showIcon message="已绑定企业微信" style={{ marginBottom: 16 }} />
        <Typography.Paragraph>
          企业微信 UserID:<Typography.Text copyable>{profile?.wecom_user_id}</Typography.Text>
        </Typography.Paragraph>
        <Popconfirm title="确认解绑企业微信?" onConfirm={onUnbind}>
          <Button danger>解绑</Button>
        </Popconfirm>
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center' }}>
      {qrUrl ? (
        <>
          <QRCodeSVG value={qrUrl} size={180} />
          <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
            使用企业微信扫码,扫码确认后自动完成绑定
          </Typography.Paragraph>
        </>
      ) : qrError ? (
        <Alert
          type="warning"
          showIcon
          message="无法生成绑定二维码"
          description={qrError}
          style={{ marginBottom: 16, textAlign: 'left' }}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="点击下方按钮生成绑定二维码"
          style={{ marginBottom: 16 }}
        />
      )}
      <Space>
        <Button
          type="primary"
          icon={<QrcodeOutlined />}
          loading={loading}
          onClick={loadQrcode}
        >
          {qrUrl ? '重新生成二维码' : '生成绑定二维码'}
        </Button>
        <Button icon={<ReloadOutlined />} loading={refreshing} onClick={refreshBindStatus}>
          刷新绑定状态
        </Button>
      </Space>
    </div>
  )
}

/** API Key 管理 */
function ApiKeyTab() {
  const [keys, setKeys] = useState<SysApiKey[]>([])
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<CreateApiKeyResult | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const list = await listApiKeys()
      setKeys(list ?? [])
    } catch {
      // 错误已由拦截器提示
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onDisable = async (id: number) => {
    await disableApiKey(id)
    message.success('已禁用')
    load()
  }

  const onDelete = async (id: number) => {
    await deleteApiKey(id)
    message.success('已删除')
    load()
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <ModalForm<{ name: string }>
          title="创建 API Key"
          trigger={
            <Button type="primary" icon={<KeyOutlined />}>
              创建 Key
            </Button>
          }
          modalProps={{ destroyOnHidden: true }}
          onFinish={async (values) => {
            const res = await createApiKey(values.name)
            setCreated(res)
            load()
            return true
          }}
        >
          <ProFormText
            name="name"
            label="名称"
            placeholder="给这个 Key 起个名字,便于识别用途"
            rules={[{ required: true, message: '请输入名称' }]}
          />
        </ModalForm>
      </div>
      <Table<SysApiKey>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={keys}
        pagination={false}
        columns={[
          { title: '名称', dataIndex: 'name' },
          { title: '前缀', dataIndex: 'key_prefix', width: 110 },
          {
            title: '最后使用',
            dataIndex: 'last_used_at',
            width: 150,
            render: (v: string | null) => v || '从未使用',
          },
          {
            title: '过期时间',
            dataIndex: 'expires_at',
            width: 150,
            render: (v: string | null) => v || '永不过期',
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 80,
            render: (v: number) =>
              v === 1 ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>,
          },
          {
            title: '操作',
            key: 'action',
            width: 110,
            render: (_, record) => (
              <Space size={4}>
                {record.status === 1 && (
                  <Popconfirm title="确认禁用该 Key?" onConfirm={() => onDisable(record.id)}>
                    <Button type="link" size="small">
                      禁用
                    </Button>
                  </Popconfirm>
                )}
                <Popconfirm title="确认删除该 Key?" onConfirm={() => onDelete(record.id)}>
                  <Button type="link" size="small" danger>
                    删除
                  </Button>
                </Popconfirm>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title="API Key 创建成功"
        open={!!created}
        footer={
          <Button type="primary" onClick={() => setCreated(null)}>
            我已保存
          </Button>
        }
        onCancel={() => setCreated(null)}
      >
        <Alert
          type="warning"
          showIcon
          message="明文密钥仅此一次展示,请妥善保存"
          style={{ marginBottom: 16 }}
        />
        <Typography.Paragraph style={{ wordBreak: 'break-all' }}>
          <Typography.Text copyable strong>
            {created?.api_key}
          </Typography.Text>
        </Typography.Paragraph>
      </Modal>
    </div>
  )
}

/** 个人中心抽屉,受控组件,可在布局与页面中复用 */
export default function ProfileCenter({ open, onClose }: ProfileCenterProps) {
  return (
    <Drawer title="个人中心" width={520} open={open} onClose={onClose} destroyOnHidden>
      <Tabs
        items={[
          { key: 'basic', label: '基本信息', children: <BasicInfoTab /> },
          { key: 'password', label: '修改密码', children: <PasswordTab onClose={onClose} /> },
          { key: 'wecom', label: '企业微信', children: <WecomTab /> },
          { key: 'apikey', label: 'API Key', children: <ApiKeyTab /> },
        ]}
      />
    </Drawer>
  )
}
