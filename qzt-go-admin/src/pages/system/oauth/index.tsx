import { useEffect, useState } from 'react'
import { Alert, App, Button, Card, Col, Form, Input } from 'antd'
import {
  ProForm,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import {
  createOauthConfig,
  listOauthConfigs,
  setOauthConfigEnable,
  updateOauthConfig,
} from '../../../services/system'
import type { OauthConfigPayload, SysOauthConfig } from '../../../types'

/**
 * 第三方应用配置页(当前:企业微信)。
 *
 * 企业微信一套凭证(CorpID + Secret + AgentID)统一服务于:
 *  1) 扫码登录 —— OAuth 回调到 redirect_uri
 *  2) SCRM —— 通讯录/客户等 API
 *  3) 消息通知 —— 应用消息推送(notify.pushWecom 亦从此处读凭证 + enabled)
 *
 * 配置存 sys_oauth_config(provider='wecom'),表本身支持多 provider,
 * 未来扩展飞书/钉钉只需新增 provider 记录(本页可演进为按 provider 分 Tab)。
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

const DEFAULT_REDIRECT = 'https://m.devlovecode.com/auth/wecom/bind'
const DEFAULT_WECHAT_REDIRECT = 'https://m.devlovecode.com/auth/wechat/callback'

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
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  return (
    <div>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="企业微信集成配置"
        description={
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            配置的<b>一套企业微信凭证</b>(CorpID + Secret + AgentID)统一服务于扫码登录、SCRM、消息通知三大场景。
            启用后,已绑定企业微信的员工会通过企业微信应用收到系统通知。
          </div>
        }
      />

      <Card title="企业微信凭证配置" style={{ marginBottom: 16 }}>
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
      </Card>

      <Card title="微信服务号配置(通知推送 + 微信内免登录)" style={{ marginBottom: 16 }}>
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
        <div style={{ fontSize: 13, lineHeight: 2, color: '#666' }}>
          <p style={{ margin: '4px 0' }}>
            <b>① 微信内免登录</b>：员工在微信中打开移动端可一键登录(需已绑定);绑定入口在移动端「我的 → 消息通知」。
          </p>
          <p style={{ margin: '4px 0' }}>
            <b>② 模板消息通知</b>：需<b>已认证服务号</b>并配置模板 ID;审批待办、跟进提醒等会推送到员工微信,点击直达处理。
          </p>
        </div>
      </Card>

      <Card title="功能与消息通知说明">
        <div style={{ fontSize: 13, lineHeight: 2 }}>
          <p style={{ margin: '4px 0' }}>
            <b>① 扫码登录</b>：员工用企业微信扫码登录后台(admin)与移动端(m),回调地址见上方表单。企业微信后台「网页授权及
            JS-SDK → 可信域名」需填写 <code>m.devlovecode.com</code>(仅域名)。
          </p>
          <p style={{ margin: '4px 0' }}>
            <b>② SCRM</b>：通过此凭证调用企业微信通讯录 / 客户 API(客户、客户群等同步)。
          </p>
          <p style={{ margin: '4px 0' }}>
            <b>③ 消息通知</b>：启用后,以下系统事件会自动推送到员工的企业微信(需员工已绑定企业微信):
          </p>
          <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
            <li>审批待办 —— 有新审批任务分配给员工时</li>
            <li>审批结果 —— 员工提交的审批有结果时</li>
            <li>跟进提醒 —— 负责的客户/线索/商机超期未跟进(每日 09:00 扫描)</li>
            <li>客户留言 —— 官网联系表单提交时(通知管理员)</li>
          </ul>
          <p style={{ margin: '4px 0', color: '#888' }}>
            注:站内信(SSE 实时弹窗)始终推送;企业微信推送需上方凭证启用且员工已在移动端「我的」绑定企业微信。
          </p>
        </div>
      </Card>
    </div>
  )
}
