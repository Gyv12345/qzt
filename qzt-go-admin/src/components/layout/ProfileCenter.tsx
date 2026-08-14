import { EditOutlined, KeyOutlined, QrcodeOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  Alert,
  Avatar,
  Button,
  Collapse,
  Divider,
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
  Tooltip,
  Typography,
} from 'antd'
import { ModalForm, ProFormCheckbox, ProFormText } from '@ant-design/pro-components'
import { useEffect, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import ImageUpload from '../ImageUpload'
import {
  changePassword,
  checkWecomBindStatus,
  createApiKey,
  deleteApiKey,
  disableApiKey,
  fetchUserInfo,
  getApiKeyToolsets,
  getWecomBindQrcode,
  listApiKeys,
  logout,
  unbindWecom,
  updateApiKey,
  updateProfile,
} from '../../services/auth'
import { getSiteConfig } from '../../services/system'
import type { CreateApiKeyResult, McpToolset, SysApiKey, UpdateProfileRequest } from '../../types'

interface ProfileCenterProps {
  open: boolean
  onClose: () => void
}

/** 基本信息 */
export function BasicInfoTab() {
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
        <Form.Item name="avatar" label="头像">
          <ImageUpload folder="avatars" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={saving} block>
          保存
        </Button>
      </Form>
    </div>
  )
}

/** 修改密码(成功后全部会话失效,强制重新登录) */
export function PasswordTab({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate()
  const [form] = Form.useForm<{ old_password: string; new_password: string; confirm: string }>()
  const [saving, setSaving] = useState(false)

  const onFinish = async (values: { old_password: string; new_password: string }) => {
    setSaving(true)
    try {
      await changePassword({ old_password: values.old_password, new_password: values.new_password })
      message.success('密码已修改,请重新登录')
      onClose?.()
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
export function WecomTab() {
  const profile = useAuthStore((s) => s.profile)
  const [qrUrl, setQrUrl] = useState('')
  const [qrError, setQrError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const bound = !!profile?.wecom_user_id

  // 生成二维码后自动轮询绑定状态(每 2s, 最多 5 分钟)
  useEffect(() => {
    if (!qrUrl || bound) return
    let active = true
    const maxAttempts = 150 // 2s * 150 = 5min
    let attempts = 0
    const timer = setInterval(async () => {
      attempts++
      if (attempts > maxAttempts) {
        clearInterval(timer)
        return
      }
      try {
        const res = await checkWecomBindStatus()
        if (active && res.bound) {
          clearInterval(timer)
          await fetchUserInfo()
          message.success('企业微信绑定成功')
        }
      } catch {
        // 忽略轮询错误
      }
    }, 2000)
    return () => {
      active = false
      clearInterval(timer)
    }
  }, [qrUrl, bound])

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

/**
 * 生成各 MCP 客户端的配置文本。
 * @param apiKey 明文 API Key(qzt_ 前缀);已有 Key 的用户传占位符
 * @param mcpUrl MCP 服务端点(站点配置下发,留空兜底 origin+/mcp)
 */
function buildMcpConfigs(apiKey: string, mcpUrl: string) {
  return [
    {
      key: 'claude',
      label: 'Claude Code / Claude Desktop',
      filename: '.mcp.json(项目根目录)或 ~/.claude.json',
      language: 'json',
      content: JSON.stringify(
        {
          mcpServers: {
            'qzt-erp': {
              type: 'http',
              url: mcpUrl,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2,
      ),
    },
    {
      key: 'codex',
      label: 'Codex CLI (OpenAI)',
      filename: '~/.codex/config.toml',
      language: 'toml',
      content: `[mcp_servers.qzt-erp]\ntransport = "http"\nurl = "${mcpUrl}"\nauth_token = "${apiKey}"`,
    },
    {
      key: 'cursor',
      label: 'Cursor',
      filename: '.cursor/mcp.json(项目根目录)',
      language: 'json',
      content: JSON.stringify(
        {
          mcpServers: {
            'qzt-erp': {
              url: mcpUrl,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2,
      ),
    },
    {
      key: 'vscode',
      label: 'VS Code (GitHub Copilot)',
      filename: 'settings.json → github.copilot.chat.mcp.servers',
      language: 'json',
      content: JSON.stringify(
        {
          'qzt-erp': {
            type: 'http',
            url: mcpUrl,
            headers: { Authorization: `Bearer ${apiKey}` },
          },
        },
        null,
        2,
      ),
    },
  ]
}

/** MCP 配置展示区:Collapse 折叠,每个客户端一个面板,代码块可一键复制 */
function McpConfigSection({ apiKey, mcpUrl }: { apiKey: string; mcpUrl: string }) {
  const configs = buildMcpConfigs(apiKey, mcpUrl)
  return (
    <Collapse
      ghost
      items={configs.map((c) => ({
        key: c.key,
        label: (
          <span>
            <Typography.Text strong>{c.label}</Typography.Text>{' '}
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {c.filename}
            </Typography.Text>
          </span>
        ),
        children: (
          <pre
            style={{
              background: '#f5f5f5',
              padding: 12,
              borderRadius: 6,
              fontSize: 12,
              margin: 0,
              overflowX: 'auto',
              position: 'relative',
            }}
          >
            <Typography.Text
              copyable
              style={{ position: 'absolute', top: 4, right: 8 }}
            />
            {c.content}
          </pre>
        ),
      }))}
    />
  )
}

/** API Key 管理 */
export function ApiKeyTab() {
  const [keys, setKeys] = useState<SysApiKey[]>([])
  const [catalog, setCatalog] = useState<McpToolset[]>([])
  const [loading, setLoading] = useState(false)
  const [created, setCreated] = useState<CreateApiKeyResult | null>(null)
  // MCP 服务地址:优先取站点配置,留空兜底当前站点 origin + /mcp(私有化部署同域场景开箱即用)
  const [mcpUrl, setMcpUrl] = useState(`${window.location.origin}/mcp`)

  const load = async () => {
    setLoading(true)
    try {
      const [list, sets, sc] = await Promise.all([listApiKeys(), getApiKeyToolsets(), getSiteConfig()])
      setKeys(list ?? [])
      setCatalog(sets ?? [])
      if (sc?.mcp_url) setMcpUrl(sc.mcp_url)
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

  // 工具集勾选项(带实时工具数)
  const toolsetOptions = catalog.map((t) => ({
    label: `${t.name}(${t.tool_count})`,
    value: t.key,
  }))

  // 工具集展示:空 = 不限制(全部);否则显示数量,hover 看明细
  const renderToolsets = (toolsets?: string[]) => {
    if (!toolsets || toolsets.length === 0) return <Tag color="geekblue">全部工具</Tag>
    const names = toolsets.map((k) => catalog.find((t) => t.key === k)?.name || k)
    return (
      <Tooltip title={names.join('、')}>
        <Tag color="cyan">{toolsets.length} 个模块</Tag>
      </Tooltip>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <ModalForm<{ name: string; toolsets?: string[] }>
          title="创建 API Key"
          trigger={
            <Button type="primary" icon={<KeyOutlined />}>
              创建 Key
            </Button>
          }
          modalProps={{ destroyOnHidden: true }}
          onFinish={async (values) => {
            const res = await createApiKey(values.name, values.toolsets ?? [])
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
          <ProFormCheckbox.Group
            name="toolsets"
            label="可用模块(MCP 工具集)"
            options={toolsetOptions}
            extra="勾选后该 Key 只能使用所选模块的 MCP 工具;不勾选 = 不限制(暴露全部工具,会显著增加 AI 的上下文占用)"
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
          { title: '前缀', dataIndex: 'key_prefix', width: 100 },
          {
            title: '可用模块',
            dataIndex: 'toolsets',
            width: 110,
            render: (v: string[]) => renderToolsets(v),
          },
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
            width: 70,
            render: (v: number) =>
              v === 1 ? <Tag color="green">启用</Tag> : <Tag>禁用</Tag>,
          },
          {
            title: '操作',
            key: 'action',
            width: 140,
            render: (_, record) => (
              <Space size={4}>
                <ModalForm<{ name: string; toolsets?: string[] }>
                  title="编辑 API Key"
                  trigger={
                    <Button type="link" size="small" icon={<EditOutlined />}>
                      编辑
                    </Button>
                  }
                  modalProps={{ destroyOnHidden: true }}
                  initialValues={{ name: record.name, toolsets: record.toolsets ?? [] }}
                  onFinish={async (values) => {
                    await updateApiKey(record.id, {
                      name: values.name,
                      toolsets: values.toolsets ?? [],
                    })
                    message.success('已更新')
                    load()
                    return true
                  }}
                >
                  <ProFormText
                    name="name"
                    label="名称"
                    rules={[{ required: true, message: '请输入名称' }]}
                  />
                  <ProFormCheckbox.Group
                    name="toolsets"
                    label="可用模块(MCP 工具集)"
                    options={toolsetOptions}
                    extra="不勾选任何模块 = 不限制(暴露全部工具)"
                  />
                </ModalForm>
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
      <Collapse
        size="small"
        style={{ marginTop: 16 }}
        items={[
          {
            key: 'mcp',
            label: (
              <span>
                🔗 MCP 配置说明
                <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                  Claude Code / Codex / Cursor 等
                </Typography.Text>
              </span>
            ),
            children: (
              <>
                <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
                  企智通 ERP 的 MCP 端点为
                  <Typography.Text code copyable>
                    {mcpUrl}
                  </Typography.Text>
                  ,使用 API Key 认证。将下方配置中的
                  <Typography.Text code>YOUR_API_KEY</Typography.Text>
                  替换为你的 Key 即可。
                </Typography.Paragraph>
                <McpConfigSection apiKey="YOUR_API_KEY" mcpUrl={mcpUrl} />
              </>
            ),
          },
        ]}
      />
      <Modal
        title="API Key 创建成功"
        open={!!created}
        width={560}
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
        <Divider style={{ margin: '16px 0' }} />
        <Typography.Title level={5} style={{ marginTop: 0 }}>
          🔗 MCP 客户端配置
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4 }}>
          将以下配置写入对应客户端,即可在你的 IDE / AI 助手里直接操作企智通 ERP。
          下方已自动填入本次生成的 Key。
        </Typography.Paragraph>
        {created?.api_key && <McpConfigSection apiKey={created.api_key} mcpUrl={mcpUrl} />}
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
