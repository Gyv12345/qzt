import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { App, Avatar, Button, Card, Col, Form, Input, Progress, Select, Space, Tag } from 'antd'
import { BellOutlined } from '@ant-design/icons'
import {
  ProForm,
  ProFormDigit,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import { getContactSyncStatus, triggerContactSync } from '../../../services/enterprise'
import {
  batchUpdateConfigs,
  createOauthConfig,
  getTianyanchaConfig,
  listConfigs,
  listOauthConfigs,
  refreshConfigCache,
  setOauthConfigEnable,
  updateOauthConfig,
  updateTianyanchaConfig,
} from '../../../services/system'
import type {
  ContactSyncStatus,
  OauthConfigPayload,
  SysOauthConfig,
  TianyanchaConfig,
} from '../../../types'

/**
 * 第三方应用配置页(企业微信 / 钉钉 / 飞书 / 微信服务号 / 天眼查)。
 *
 * 企业微信一套凭证(CorpID + Secret + AgentID)统一服务于:
 *  1) 扫码登录 —— OAuth 回调到 redirect_uri
 *  2) SCRM —— 通讯录/客户等 API
 *  3) 消息通知 —— 应用消息推送(notify.pushWecom 亦从此处读凭证 + enabled)
 *
 * 钉钉/飞书(provider='dingtalk'/'feishu')服务扫码登录与通讯录同步:
 * 凭证同存 sys_oauth_config(钉钉 AgentId 序列化进 extra.agent_id),
 * 通讯录同步为异步 job(POST /enterprise/contact-sync/{platform}),结果以状态接口为准。
 */

interface WecomFormValues {
  enabled: boolean
  name: string
  app_id: string
  /** 留空表示不修改(后端不回填,脱敏) */
  app_secret: string
  agent_id: string
  redirect_uri: string
  extra: string
  remark: string
}

interface WechatFormValues {
  enabled: boolean
  app_id: string
  app_secret: string
  redirect_uri: string
  template_id: string
  remark: string
}

interface TianyanchaFormValues {
  /** MCP 端点 URL(已配置时为脱敏尾段,修改需输入完整 URL) */
  endpoint: string
  /** 留空表示不修改(脱敏回显 ****尾4) */
  api_key: string
  daily_limit?: number
}

interface DingtalkFormValues {
  enabled: boolean
  /** 钉钉开放平台 AppKey(存 sys_oauth_config.app_id) */
  app_id: string
  /** 留空表示不修改(后端不回填,脱敏) */
  app_secret: string
  /** 应用 AgentId(序列化进 extra.agent_id) */
  agent_id: string
  remark: string
}

interface FeishuFormValues {
  enabled: boolean
  /** 飞书开放平台 App ID(存 sys_oauth_config.app_id) */
  app_id: string
  /** 留空表示不修改(后端不回填,脱敏) */
  app_secret: string
  remark: string
}

const DEFAULT_REDIRECT = 'https://m.devlovecode.com/auth/wecom/bind'
const DEFAULT_WECHAT_REDIRECT = 'https://m.devlovecode.com/auth/wechat/callback'

/** 站外推送通道 sys_config 键(企业微信默认,可选钉钉/飞书/不推送) */
const NOTIFY_CHANNEL_KEY = 'notify.external_channel'

/** 站外推送通道选项(通知卡片 Select 与 extra 标签共用) */
const CHANNEL_OPTIONS = [
  { value: 'wecom', label: '企业微信应用消息' },
  { value: 'dingtalk', label: '钉钉应用消息' },
  { value: 'feishu', label: '飞书应用消息' },
  { value: 'none', label: '不推送(仅站内信)' },
]

/** 平台元信息(概览磁贴 + 各配置卡头像/标题共用) */
interface PlatformMeta {
  key: string
  /** 配置卡片 DOM 锚点(概览磁贴点击后滚动定位) */
  anchor: string
  letter: string
  color: string
  name: string
  desc: string
  /** 配置卡片标题原文 */
  title: string
}

const PLATFORMS: PlatformMeta[] = [
  {
    key: 'wecom',
    anchor: 'oauth-card-wecom',
    letter: '企',
    color: '#2f54eb',
    name: '企业微信',
    desc: '扫码登录 · SCRM · 消息通知',
    title: '企业微信凭证配置',
  },
  {
    key: 'dingtalk',
    anchor: 'oauth-card-dingtalk',
    letter: '钉',
    color: '#1677ff',
    name: '钉钉',
    desc: '扫码登录 · 通讯录同步',
    title: '钉钉配置(扫码登录 + 通讯录同步)',
  },
  {
    key: 'feishu',
    anchor: 'oauth-card-feishu',
    letter: '飞',
    color: '#13c2c2',
    name: '飞书',
    desc: '扫码登录 · 通讯录同步',
    title: '飞书配置(扫码登录 + 通讯录同步)',
  },
  {
    key: 'wechat_mp',
    anchor: 'oauth-card-wechat',
    letter: '微',
    color: '#07c160',
    name: '微信服务号',
    desc: '微信内免登录 · 模板消息',
    title: '微信服务号配置(通知推送 + 微信内免登录)',
  },
  {
    key: 'tianyancha',
    anchor: 'oauth-card-tianyancha',
    letter: '天',
    color: '#fa8c16',
    name: '天眼查',
    desc: 'CRM 企业工商信息查询',
    title: '天眼查 MCP 配置(企业工商信息查询)',
  },
]

type PlatformStatus = 'on' | 'off' | 'unset'

/** 平台状态 → Tag 颜色/文案(天眼查 on 态文案覆写为「已配置」) */
const STATUS_META: Record<PlatformStatus, { tag: 'success' | 'warning' | 'default'; text: string }> = {
  on: { tag: 'success', text: '已启用' },
  off: { tag: 'warning', text: '已停用' },
  unset: { tag: 'default', text: '未配置' },
}

/** 卡片脚注文档盒(统一底色/字号,深浅色均走 token 变量) */
const DOC_BOX: CSSProperties = {
  background: 'var(--ant-color-fill-quaternary)',
  borderRadius: 8,
  padding: '10px 14px',
  fontSize: 13,
  lineHeight: 1.9,
  color: 'var(--ant-color-text-secondary)',
}

/** 卡片脚注说明块(DOC_BOX 容器) */
function Tips({ children }: { children: ReactNode }) {
  return <div style={{ ...DOC_BOX, marginTop: 12 }}>{children}</div>
}

/** 平台启用状态推导(未建记录 = 未配置) */
const statusOf = (rec: SysOauthConfig | null): PlatformStatus =>
  !rec?.id ? 'unset' : rec.enabled === 1 ? 'on' : 'off'

/** 平滑滚动到对应配置卡片 */
const scrollToCard = (anchor: string) => {
  document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function OauthConfigPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<WecomFormValues>()
  const [loading, setLoading] = useState(false)
  /** 当前企业微信配置记录(单例:provider=wecom 的第一条) */
  const [record, setRecord] = useState<SysOauthConfig | null>(null)

  const [wxForm] = Form.useForm<WechatFormValues>()
  const [wxLoading, setWxLoading] = useState(false)
  /** 当前微信服务号配置记录(单例:provider=wechat_mp 的第一条) */
  const [wxRecord, setWxRecord] = useState<SysOauthConfig | null>(null)

  const [tycForm] = Form.useForm<TianyanchaFormValues>()
  const [tycLoading, setTycLoading] = useState(false)
  /** 天眼查 MCP 配置(endpoint 脱敏、api_key 不回显) */
  const [tycConfig, setTycConfig] = useState<TianyanchaConfig | null>(null)

  const [ddForm] = Form.useForm<DingtalkFormValues>()
  const [ddLoading, setDdLoading] = useState(false)
  /** 当前钉钉配置记录(单例:provider=dingtalk 的第一条) */
  const [ddRecord, setDdRecord] = useState<SysOauthConfig | null>(null)

  const [fsForm] = Form.useForm<FeishuFormValues>()
  const [fsLoading, setFsLoading] = useState(false)
  /** 当前飞书配置记录(单例:provider=feishu 的第一条) */
  const [fsRecord, setFsRecord] = useState<SysOauthConfig | null>(null)

  /** 各平台通讯录同步状态(platform → status) */
  const [syncStatus, setSyncStatus] = useState<Record<string, ContactSyncStatus>>({})
  /** 触发同步后的进行中标记(按钮 loading) */
  const [syncing, setSyncing] = useState<Record<string, boolean>>({})
  const syncPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /** 站外推送通道(notify.external_channel:wecom/dingtalk/feishu/none) */
  const [channel, setChannel] = useState('wecom')
  const [channelSaving, setChannelSaving] = useState(false)

  const loadTianyancha = async () => {
    const cfg = await getTianyanchaConfig()
    setTycConfig(cfg)
    tycForm.setFieldsValue({
      endpoint: cfg?.endpoint ?? '',
      api_key: '', // 不回填,留空表示不修改
      daily_limit: cfg?.daily_limit || undefined,
    })
  }

  const load = async () => {
    const list = await listOauthConfigs()
    const rec = list.find((c) => c.provider === 'wecom') ?? null
    setRecord(rec)
    form.setFieldsValue({
      enabled: rec?.enabled === 1,
      name: rec?.name ?? '企业微信',
      app_id: rec?.app_id ?? '',
      app_secret: '', // 不回填,留空表示不修改
      agent_id: rec?.agent_id ?? '',
      redirect_uri: rec?.redirect_uri || DEFAULT_REDIRECT,
      extra: rec?.extra ?? '',
      remark: rec?.remark ?? '',
    })

    const wxRec = list.find((c) => c.provider === 'wechat_mp') ?? null
    setWxRecord(wxRec)
    let templateID = ''
    try {
      templateID = JSON.parse(wxRec?.extra || '{}')?.template_id ?? ''
    } catch {
      templateID = ''
    }
    wxForm.setFieldsValue({
      enabled: wxRec?.enabled === 1,
      app_id: wxRec?.app_id ?? '',
      app_secret: '',
      redirect_uri: wxRec?.redirect_uri || DEFAULT_WECHAT_REDIRECT,
      template_id: templateID,
      remark: wxRec?.remark ?? '',
    })

    const ddRec = list.find((c) => c.provider === 'dingtalk') ?? null
    setDdRecord(ddRec)
    let ddAgentId = ''
    try {
      ddAgentId = JSON.parse(ddRec?.extra || '{}')?.agent_id ?? ''
    } catch {
      ddAgentId = ''
    }
    ddForm.setFieldsValue({
      enabled: ddRec?.enabled === 1,
      app_id: ddRec?.app_id ?? '',
      app_secret: '', // 不回填,留空表示不修改
      agent_id: ddAgentId,
      remark: ddRec?.remark ?? '',
    })

    const fsRec = list.find((c) => c.provider === 'feishu') ?? null
    setFsRecord(fsRec)
    fsForm.setFieldsValue({
      enabled: fsRec?.enabled === 1,
      app_id: fsRec?.app_id ?? '',
      app_secret: '', // 不回填,留空表示不修改
      remark: fsRec?.remark ?? '',
    })
  }

  /** 拉取各平台通讯录同步状态(失败静默,卡片内保持「尚未同步」展示) */
  const loadSyncStatus = async (): Promise<Record<string, ContactSyncStatus>> => {
    try {
      const list = await getContactSyncStatus()
      const map: Record<string, ContactSyncStatus> = {}
      for (const s of list ?? []) map[s.platform] = s
      setSyncStatus(map)
      return map
    } catch {
      return {}
    }
  }

  const stopSyncPolling = () => {
    if (syncPollRef.current) {
      clearInterval(syncPollRef.current)
      syncPollRef.current = null
    }
  }

  /** 同步为异步 job:触发后轮询状态接口,直到该平台不再是 running(最多 60s) */
  const startSyncPolling = (platform: string) => {
    stopSyncPolling()
    let ticks = 0
    syncPollRef.current = setInterval(async () => {
      ticks += 1
      const map = await loadSyncStatus()
      const st = map[platform]?.status
      if ((st && st !== 'running') || ticks >= 20) {
        stopSyncPolling()
        setSyncing((prev) => ({ ...prev, [platform]: false }))
      }
    }, 3000)
  }

  useEffect(() => {
    load()
    loadTianyancha().catch(() => {
      // 天眼查配置读取失败不阻塞页面,卡片内状态保持未配置展示
    })
    loadSyncStatus()
    // 站外推送通道当前值(键不存在时保持默认企业微信)
    listConfigs()
      .then((cfgs) => {
        const rec = (cfgs ?? []).find((c) => c.key === NOTIFY_CHANNEL_KEY)
        if (rec?.value) setChannel(rec.value)
      })
      .catch(() => {})
    return () => stopSyncPolling()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveTianyancha = async (values: TianyanchaFormValues) => {
    setTycLoading(true)
    try {
      await updateTianyanchaConfig({
        endpoint: values.endpoint,
        api_key: values.api_key || '', // 已配置时留空表示不修改
        daily_limit: values.daily_limit || undefined,
      })
      message.success('天眼查配置已保存')
      await loadTianyancha()
    } finally {
      setTycLoading(false)
    }
  }

  const handleSave = async (values: WecomFormValues) => {
    setLoading(true)
    try {
      const payload: OauthConfigPayload = {
        provider: 'wecom',
        name: values.name || undefined,
        app_id: values.app_id || undefined,
        app_secret: values.app_secret || undefined, // 留空表示不修改
        agent_id: values.agent_id || undefined,
        redirect_uri: values.redirect_uri || undefined,
        extra: values.extra || undefined,
        remark: values.remark || undefined,
      }
      let id = record?.id
      if (id) {
        await updateOauthConfig(id, payload)
      } else {
        await createOauthConfig(payload)
        const list = await listOauthConfigs()
        id = list.find((c) => c.provider === 'wecom')?.id
      }
      // 启用状态单独同步(setOauthConfigEnable 幂等)
      if (id) {
        await setOauthConfigEnable(id, values.enabled ? 1 : 0)
      }
      message.success('企业微信配置已保存')
      await load()
    } finally {
      setLoading(false)
    }
  }

  const handleSaveWechat = async (values: WechatFormValues) => {
    setWxLoading(true)
    try {
      // template_id 序列化进 extra(保留 extra 里已有的其他键)
      let extra: Record<string, unknown> = {}
      try {
        extra = JSON.parse(wxRecord?.extra || '{}') ?? {}
      } catch {
        extra = {}
      }
      extra.template_id = values.template_id || ''
      const payload: OauthConfigPayload = {
        provider: 'wechat_mp',
        name: '微信服务号(通知+免登录)',
        app_id: values.app_id || undefined,
        app_secret: values.app_secret || undefined, // 留空表示不修改
        redirect_uri: values.redirect_uri || undefined,
        extra: JSON.stringify(extra),
        remark: values.remark || undefined,
      }
      let id = wxRecord?.id
      if (id) {
        await updateOauthConfig(id, payload)
      } else {
        await createOauthConfig(payload)
        const list = await listOauthConfigs()
        id = list.find((c) => c.provider === 'wechat_mp')?.id
      }
      if (id) {
        await setOauthConfigEnable(id, values.enabled ? 1 : 0)
      }
      message.success('微信服务号配置已保存')
      await load()
    } finally {
      setWxLoading(false)
    }
  }

  const handleSaveDingtalk = async (values: DingtalkFormValues) => {
    setDdLoading(true)
    try {
      // AgentId 序列化进 extra(保留 extra 里已有的其他键)
      let extra: Record<string, unknown> = {}
      try {
        extra = JSON.parse(ddRecord?.extra || '{}') ?? {}
      } catch {
        extra = {}
      }
      extra.agent_id = values.agent_id || ''
      const payload: OauthConfigPayload = {
        provider: 'dingtalk',
        name: '钉钉',
        app_id: values.app_id || undefined,
        app_secret: values.app_secret || undefined, // 留空表示不修改
        extra: JSON.stringify(extra),
        remark: values.remark || undefined,
      }
      let id = ddRecord?.id
      if (id) {
        await updateOauthConfig(id, payload)
      } else {
        await createOauthConfig(payload)
        const list = await listOauthConfigs()
        id = list.find((c) => c.provider === 'dingtalk')?.id
      }
      if (id) {
        await setOauthConfigEnable(id, values.enabled ? 1 : 0)
      }
      message.success('钉钉配置已保存')
      await load()
    } finally {
      setDdLoading(false)
    }
  }

  const handleSaveFeishu = async (values: FeishuFormValues) => {
    setFsLoading(true)
    try {
      const payload: OauthConfigPayload = {
        provider: 'feishu',
        name: '飞书',
        app_id: values.app_id || undefined,
        app_secret: values.app_secret || undefined, // 留空表示不修改
        remark: values.remark || undefined,
      }
      let id = fsRecord?.id
      if (id) {
        await updateOauthConfig(id, payload)
      } else {
        await createOauthConfig(payload)
        const list = await listOauthConfigs()
        id = list.find((c) => c.provider === 'feishu')?.id
      }
      if (id) {
        await setOauthConfigEnable(id, values.enabled ? 1 : 0)
      }
      message.success('飞书配置已保存')
      await load()
    } finally {
      setFsLoading(false)
    }
  }

  /** 手动触发通讯录同步(异步 job,结果以状态接口为准) */
  const handleSync = async (platform: 'dingtalk' | 'feishu') => {
    setSyncing((prev) => ({ ...prev, [platform]: true }))
    try {
      await triggerContactSync(platform)
      message.success('同步任务已开始,结果以最后一次同步状态为准')
      await loadSyncStatus()
      startSyncPolling(platform)
    } catch {
      setSyncing((prev) => ({ ...prev, [platform]: false }))
    }
  }

  /** 卡片底部:同步按钮 + 最近一次同步状态小字(DOC_BOX 样式行) */
  const renderSyncFooter = (platform: 'dingtalk' | 'feishu') => {
    const st = syncStatus[platform]
    return (
      <div
        style={{
          ...DOC_BOX,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginTop: 12,
        }}
      >
        <Button
          size="small"
          loading={!!syncing[platform]}
          onClick={() => handleSync(platform)}
        >
          立即同步通讯录
        </Button>
        {st ? (
          <>
            <Tag
              color={
                st.status === 'success' ? 'success' : st.status === 'running' ? 'processing' : 'error'
              }
              style={{ marginInlineEnd: 0 }}
            >
              {st.status === 'success' ? '上次同步成功' : st.status === 'running' ? '同步进行中' : '上次同步失败'}
            </Tag>
            <span>最近同步:{st.last_run_time || '-'}</span>
            {st.summary ? <span>{st.summary}</span> : null}
          </>
        ) : (
          <span>尚未同步</span>
        )}
      </div>
    )
  }

  const handleSaveChannel = async () => {
    setChannelSaving(true)
    try {
      await batchUpdateConfigs([{ key: NOTIFY_CHANNEL_KEY, value: channel }])
      await refreshConfigCache().catch(() => {})
      message.success('站外推送通道已保存')
    } finally {
      setChannelSaving(false)
    }
  }

  /** 概览磁贴/卡片头部的状态展示辅助(仅展示层,不改动任何状态) */
  const platformRecords: Record<string, SysOauthConfig | null> = {
    wecom: record,
    dingtalk: ddRecord,
    feishu: fsRecord,
    wechat_mp: wxRecord,
  }
  const statusText = (key: string, status: PlatformStatus): string =>
    key === 'tianyancha' && status === 'on' ? '已配置' : STATUS_META[status].text
  const statusTag = (key: string, status: PlatformStatus) => (
    <Tag color={STATUS_META[status].tag}>{statusText(key, status)}</Tag>
  )
  const cardTitle = (key: string) => {
    const p = PLATFORMS.find((m) => m.key === key)!
    return (
      <Space size={10}>
        <Avatar
          shape="square"
          size={26}
          style={{ background: p.color, borderRadius: 6, fontSize: 13, fontWeight: 600 }}
        >
          {p.letter}
        </Avatar>
        {p.title}
      </Space>
    )
  }

  return (
    <div>
      {/* 概览磁贴:平台状态一览,点击平滑滚动到对应配置卡片 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {PLATFORMS.map((p) => {
          const st: PlatformStatus =
            p.key === 'tianyancha'
              ? tycConfig?.configured
                ? 'on'
                : 'unset'
              : statusOf(platformRecords[p.key])
          return (
            <Card
              key={p.key}
              size="small"
              hoverable
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
              onClick={() => scrollToCard(p.anchor)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  scrollToCard(p.anchor)
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar shape="square" size={40} style={{ background: p.color, borderRadius: 10, flexShrink: 0 }}>
                  {p.letter}
                </Avatar>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
                    <Tag color={STATUS_META[st].tag} style={{ marginInlineEnd: 0 }}>
                      {statusText(p.key, st)}
                    </Tag>
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 12,
                      color: 'var(--ant-color-text-tertiary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {p.desc}
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card
        id="oauth-card-wecom"
        title={cardTitle('wecom')}
        extra={statusTag('wecom', statusOf(record))}
        style={{ marginBottom: 16, scrollMarginTop: 8 }}
      >
        <ProForm<WecomFormValues>
          form={form}
          grid
          onFinish={handleSave}
          submitter={{
            render: () => (
              <Auth perm="system:oauth:edit">
                <Button type="primary" loading={loading} onClick={() => form.submit()}>
                  保存配置
                </Button>
              </Auth>
            ),
          }}
        >
          <ProFormSwitch
            name="enabled"
            label="启用"
            tooltip="开启后,扫码登录 / SCRM / 消息通知 均依赖此凭证"
            fieldProps={{ checkedChildren: '启用', unCheckedChildren: '停用' }}
            colProps={{ span: 12 }}
          />
          <ProFormText
            name="name"
            label="配置名称"
            placeholder="如 企业微信"
            colProps={{ span: 12 }}
          />
          <ProFormText
            name="app_id"
            label="CorpID(企业ID)"
            placeholder="企业微信 → 我的企业 → 企业信息 → 企业ID"
            rules={[{ required: true, message: '请输入 CorpID' }]}
            colProps={{ span: 12 }}
          />
          <Col span={12}>
            <ProForm.Item name="app_secret" label="Secret(应用密钥)">
              <Input.Password
                placeholder={record?.id ? '留空表示不修改' : '自建应用 → Secret'}
                autoComplete="new-password"
              />
            </ProForm.Item>
          </Col>
          <ProFormText
            name="agent_id"
            label="AgentID(应用ID)"
            placeholder="自建应用 → AgentId"
            colProps={{ span: 12 }}
          />
          <ProFormText
            name="redirect_uri"
            label="扫码登录回调地址"
            placeholder={DEFAULT_REDIRECT}
            extra="企业微信授权后带 code 跳到此地址,需与可信域名一致"
            colProps={{ span: 12 }}
          />
          <ProFormTextArea
            name="extra"
            label="扩展配置"
            tooltip="JSON 格式,二开时存放额外参数"
            placeholder='{"key":"value"}'
            colProps={{ span: 24 }}
          />
          <ProFormTextArea name="remark" label="备注" placeholder="备注信息" colProps={{ span: 24 }} />
        </ProForm>
        <Tips>
          <p style={{ margin: '4px 0' }}>
            <b>① 扫码登录</b>：员工用企业微信扫码登录后台(admin)与移动端(m),回调地址见上方表单。企业微信后台「网页授权及
            JS-SDK → 可信域名」需填写 <code>m.devlovecode.com</code>(仅域名)。
          </p>
          <p style={{ margin: '4px 0' }}>
            <b>② SCRM</b>：通过此凭证调用企业微信通讯录 / 客户 API(客户、客户群等同步)。
          </p>
        </Tips>
      </Card>

      <Card
        id="oauth-card-dingtalk"
        title={cardTitle('dingtalk')}
        extra={statusTag('dingtalk', statusOf(ddRecord))}
        style={{ marginBottom: 16, scrollMarginTop: 8 }}
      >
        <ProForm<DingtalkFormValues>
          form={ddForm}
          grid
          onFinish={handleSaveDingtalk}
          submitter={{
            render: () => (
              <Auth perm="system:oauth:edit">
                <Button type="primary" loading={ddLoading} onClick={() => ddForm.submit()}>
                  保存配置
                </Button>
              </Auth>
            ),
          }}
        >
          <ProFormSwitch
            name="enabled"
            label="启用"
            tooltip="开启后,钉钉扫码登录与通讯录同步生效"
            fieldProps={{ checkedChildren: '启用', unCheckedChildren: '停用' }}
            colProps={{ span: 12 }}
          />
          <ProFormText
            name="app_id"
            label="AppKey"
            placeholder="钉钉开放平台 → 应用信息 → AppKey"
            rules={[{ required: true, message: '请输入 AppKey' }]}
            colProps={{ span: 12 }}
          />
          <Col span={12}>
            <ProForm.Item name="app_secret" label="AppSecret(应用密钥)">
              <Input.Password
                placeholder={ddRecord?.id ? '留空表示不修改' : '钉钉开放平台 → 应用凭证 → AppSecret'}
                autoComplete="new-password"
              />
            </ProForm.Item>
          </Col>
          <ProFormText
            name="agent_id"
            label="AgentId(应用AgentId)"
            placeholder="钉钉开放平台 → 应用信息 → AgentId"
            tooltip="通讯录同步与消息推送使用"
            colProps={{ span: 12 }}
          />
          <ProFormTextArea name="remark" label="备注" placeholder="备注信息" colProps={{ span: 24 }} />
        </ProForm>
        {renderSyncFooter('dingtalk')}
        <Tips>
          <p style={{ margin: '4px 0' }}>
            <b>① 扫码登录</b>：员工用钉钉扫码登录后台,回调后自动登入(需在钉钉开放平台配置登录回调域名)。
          </p>
          <p style={{ margin: '4px 0' }}>
            <b>② 通讯录同步</b>：按钉钉通讯录拉取部门与员工,自动创建系统账号(与现有企微同步同口径)。
          </p>
        </Tips>
      </Card>

      <Card
        id="oauth-card-feishu"
        title={cardTitle('feishu')}
        extra={statusTag('feishu', statusOf(fsRecord))}
        style={{ marginBottom: 16, scrollMarginTop: 8 }}
      >
        <ProForm<FeishuFormValues>
          form={fsForm}
          grid
          onFinish={handleSaveFeishu}
          submitter={{
            render: () => (
              <Auth perm="system:oauth:edit">
                <Button type="primary" loading={fsLoading} onClick={() => fsForm.submit()}>
                  保存配置
                </Button>
              </Auth>
            ),
          }}
        >
          <ProFormSwitch
            name="enabled"
            label="启用"
            tooltip="开启后,飞书扫码登录与通讯录同步生效"
            fieldProps={{ checkedChildren: '启用', unCheckedChildren: '停用' }}
            colProps={{ span: 12 }}
          />
          <ProFormText
            name="app_id"
            label="App ID"
            placeholder="飞书开放平台 → 凭证与基础信息 → App ID"
            rules={[{ required: true, message: '请输入 App ID' }]}
            colProps={{ span: 12 }}
          />
          <Col span={12}>
            <ProForm.Item name="app_secret" label="App Secret(应用密钥)">
              <Input.Password
                placeholder={fsRecord?.id ? '留空表示不修改' : '飞书开放平台 → 凭证与基础信息 → App Secret'}
                autoComplete="new-password"
              />
            </ProForm.Item>
          </Col>
          <ProFormTextArea name="remark" label="备注" placeholder="备注信息" colProps={{ span: 24 }} />
        </ProForm>
        {renderSyncFooter('feishu')}
        <Tips>
          <p style={{ margin: '4px 0' }}>
            <b>① 扫码登录</b>：员工用飞书扫码登录后台,回调后自动登入(需在飞书开放平台配置重定向 URL)。
          </p>
          <p style={{ margin: '4px 0' }}>
            <b>② 通讯录同步</b>：按飞书通讯录拉取部门与员工,自动创建系统账号(与现有企微同步同口径)。
          </p>
        </Tips>
      </Card>

      <Card
        id="oauth-card-wechat"
        title={cardTitle('wechat_mp')}
        extra={statusTag('wechat_mp', statusOf(wxRecord))}
        style={{ marginBottom: 16, scrollMarginTop: 8 }}
      >
        <ProForm<WechatFormValues>
          form={wxForm}
          grid
          onFinish={handleSaveWechat}
          submitter={{
            render: () => (
              <Auth perm="system:oauth:edit">
                <Button type="primary" loading={wxLoading} onClick={() => wxForm.submit()}>
                  保存配置
                </Button>
              </Auth>
            ),
          }}
        >
          <ProFormSwitch
            name="enabled"
            label="启用"
            tooltip="开启后,微信免登录与模板消息通知生效"
            fieldProps={{ checkedChildren: '启用', unCheckedChildren: '停用' }}
            colProps={{ span: 12 }}
          />
          <ProFormText
            name="app_id"
            label="AppID(应用ID)"
            placeholder="公众平台 → 设置与开发 → 基本配置 → AppID"
            rules={[{ required: true, message: '请输入 AppID' }]}
            colProps={{ span: 12 }}
          />
          <Col span={12}>
            <ProForm.Item name="app_secret" label="AppSecret(应用密钥)">
              <Input.Password
                placeholder={wxRecord?.id ? '留空表示不修改' : '基本配置 → AppSecret'}
                autoComplete="new-password"
              />
            </ProForm.Item>
          </Col>
          <ProFormText
            name="redirect_uri"
            label="网页授权回调地址"
            placeholder={DEFAULT_WECHAT_REDIRECT}
            extra="需在公众平台「网页授权域名」配置 m.devlovecode.com,并把服务器 IP 加入 IP 白名单"
            colProps={{ span: 12 }}
          />
          <ProFormText
            name="template_id"
            label="通知模板 ID"
            tooltip="公众平台 → 功能 → 模板消息 → 添加「待办/审核提醒」类模板后复制 ID;留空则只启用免登录,不推通知"
            placeholder="留空 = 不推送模板消息"
            colProps={{ span: 12 }}
          />
          <ProFormTextArea name="remark" label="备注" placeholder="备注信息" colProps={{ span: 24 }} />
        </ProForm>
        <Tips>
          <p style={{ margin: '4px 0' }}>
            <b>① 微信内免登录</b>：员工在微信中打开移动端可一键登录(需已绑定);绑定入口在移动端「我的 → 消息通知」。
          </p>
          <p style={{ margin: '4px 0' }}>
            <b>② 模板消息通知</b>：需<b>已认证服务号</b>并配置模板 ID;审批待办、跟进提醒等会推送到员工微信,点击直达处理。
          </p>
        </Tips>
      </Card>

      <Card
        id="oauth-card-tianyancha"
        title={cardTitle('tianyancha')}
        extra={statusTag('tianyancha', tycConfig?.configured ? 'on' : 'unset')}
        style={{ marginBottom: 16, scrollMarginTop: 8 }}
      >
        {tycConfig && (
          <div
            style={{
              ...DOC_BOX,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
              marginBottom: 12,
            }}
          >
            <Tag color={tycConfig.configured ? 'success' : 'default'}>
              {tycConfig.configured ? '已配置' : '未配置'}
            </Tag>
            {tycConfig.configured ? <span>当前端点:{tycConfig.endpoint || '-'}</span> : null}
            <span>今日已用 {tycConfig.today_used ?? 0}/{tycConfig.daily_limit || 0} 次</span>
            {tycConfig.configured && (
              <Progress
                size="small"
                percent={
                  tycConfig.daily_limit > 0
                    ? Math.min(100, Math.round(((tycConfig.today_used ?? 0) / tycConfig.daily_limit) * 100))
                    : 0
                }
                style={{ flex: 1, minWidth: 140, marginBottom: 0 }}
              />
            )}
          </div>
        )}
        <ProForm<TianyanchaFormValues>
          form={tycForm}
          grid
          onFinish={handleSaveTianyancha}
          submitter={{
            render: () => (
              <Auth perm="system:oauth:edit">
                <Button type="primary" loading={tycLoading} onClick={() => tycForm.submit()}>
                  保存配置
                </Button>
              </Auth>
            ),
          }}
        >
          <ProFormText
            name="endpoint"
            label="MCP 端点 URL"
            rules={[{ required: true, message: '请输入天眼查 MCP 端点 URL' }]}
            placeholder="https://mcp.tianyancha.com/sse/..."
            extra="天眼查 MCP 服务地址;已配置时为脱敏尾段,修改请输入完整 URL"
            colProps={{ span: 12 }}
          />
          <Col span={12}>
            <ProForm.Item name="api_key" label="API Key">
              <Input.Password
                placeholder={
                  tycConfig?.configured
                    ? '已配置(****尾4),留空表示不修改'
                    : '请输入天眼查 API Key'
                }
                autoComplete="new-password"
              />
            </ProForm.Item>
          </Col>
          <ProFormDigit
            name="daily_limit"
            label="每日查询上限"
            min={1}
            precision={0}
            placeholder="留空使用默认值"
            fieldProps={{ style: { width: '100%' } }}
            colProps={{ span: 12 }}
          />
        </ProForm>
        <Tips>
          <p style={{ margin: '4px 0' }}>
            <b>用途</b>:CRM 客户详情「天眼查查询」按钮调用天眼查 MCP 获取企业工商信息(法人 /
            注册资本 / 成立日期 / 经营状态 / 统一社会信用代码 / 参保人数 / 注册地址),可一键写入跟进记录留痕。
          </p>
          <p style={{ margin: '4px 0', color: 'var(--ant-color-text-tertiary)' }}>
            注:API Key 保存后脱敏回显(仅显示尾 4 位);每位用户每日查询次数受「每日查询上限」控制,超限时提示「今日查询已达上限」。
          </p>
        </Tips>
      </Card>

      <Card
        id="oauth-card-notify"
        title={
          <Space size={10}>
            <Avatar
              shape="square"
              size={26}
              style={{
                background: 'var(--ant-color-primary-bg)',
                color: 'var(--ant-color-primary)',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
              }}
              icon={<BellOutlined />}
            />
            功能与消息通知说明
          </Space>
        }
        extra={
          <Tag color="processing">
            {CHANNEL_OPTIONS.find((o) => o.value === channel)?.label ?? channel}
          </Tag>
        }
        style={{ marginBottom: 16, scrollMarginTop: 8 }}
      >
        <div
          style={{
            ...DOC_BOX,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 500 }}>站外推送通道:</span>
          <Select
            value={channel}
            style={{ width: 220 }}
            onChange={setChannel}
            options={CHANNEL_OPTIONS}
          />
          <Auth perm="system:oauth:edit">
            <Button type="primary" loading={channelSaving} onClick={handleSaveChannel}>
              保存通道
            </Button>
          </Auth>
          <span style={{ fontSize: 12, color: 'var(--ant-color-text-tertiary)' }}>
            审批待办/审批结果/跟进提醒/客户留言等系统事件按此通道推送;选择钉钉/飞书需先配置并启用对应平台凭证
          </span>
        </div>
        <Tips>
          <p style={{ margin: '4px 0' }}>
            <b>③ 消息通知</b>：启用后,以下系统事件会自动推送到员工的企业微信(需员工已绑定企业微信):
          </p>
          <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
            <li>审批待办 —— 有新审批任务分配给员工时</li>
            <li>审批结果 —— 员工提交的审批有结果时</li>
            <li>跟进提醒 —— 负责的客户/线索/商机超期未跟进(每日 09:00 扫描)</li>
            <li>客户留言 —— 官网联系表单提交时(通知管理员)</li>
          </ul>
          <p style={{ margin: '4px 0', color: 'var(--ant-color-text-tertiary)' }}>
            注:站内信(SSE 实时弹窗)始终推送;企业微信推送需上方凭证启用且员工已在移动端「我的」绑定企业微信。
          </p>
        </Tips>
      </Card>
    </div>
  )
}
