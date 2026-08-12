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
 * 企业微信一套凭证(CorpID + Secret + AgentID)同时服务于:
 *  1) 扫码登录 —— 走 OAuth,回调到 redirect_uri
 *  2) SCRM —— 通讯录/客户等 API 调用
 *  3) 消息通知 —— 应用消息推送
 *
 * 配置存 sys_oauth_config(provider='wecom'),表本身支持多 provider,
 * 未来扩展飞书/钉钉只需新增 provider 配置(本页可演进为按 provider 分 Tab)。
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

const DEFAULT_REDIRECT = 'https://m.devlovecode.com/auth/wecom/bind'

export default function OauthConfigPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<WecomFormValues>()
  const [loading, setLoading] = useState(false)
  /** 当前企业微信配置记录(单例:provider=wecom 的第一条) */
  const [record, setRecord] = useState<SysOauthConfig | null>(null)

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
        // 新建后重拉拿到 id
        const list = await listOauthConfigs()
        id = list.find((c) => c.provider === 'wecom')?.id
      }
      // 启用状态单独同步(setOauthConfigEnable 幂等,设相同值无害)
      if (id) {
        await setOauthConfigEnable(id, values.enabled ? 1 : 0)
      }
      message.success('企业微信配置已保存')
      await load()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 960 }}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="企业微信集成配置"
        description={
          <div style={{ fontSize: 13, lineHeight: 1.8 }}>
            <p style={{ margin: '4px 0' }}>
              这里配置的<b>一套企业微信凭证</b>(CorpID + Secret + AgentID)同时服务于以下场景:
            </p>
            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
              <li>
                <b>扫码登录</b>:员工/访客用企业微信扫码登录后台与移动端
              </li>
              <li>
                <b>SCRM</b>:同步企业微信通讯录、客户、客户群等数据
              </li>
              <li>
                <b>消息通知</b>:审批待办、跟进提醒等通过企业微信应用消息推送
              </li>
            </ul>
            <p style={{ margin: '4px 0' }}>
              <b>获取凭证</b>:登录{' '}
              <a href="https://work.weixin.qq.com/wework_admin/frame" target="_blank" rel="noreferrer">
                企业微信管理后台
              </a>
              ,在「应用管理 → 自建应用」创建应用 ——
            </p>
            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
              <li>
                <b>CorpID</b>:「我的企业 → 企业信息 → 企业ID」
              </li>
              <li>
                <b>Secret</b>:自建应用 → Secret(点查看)
              </li>
              <li>
                <b>AgentID</b>:自建应用 → AgentId
              </li>
            </ul>
            <p style={{ margin: '4px 0' }}>
              <b>扫码登录回调</b>:企业微信「自建应用 → 开发者接口 → 网页授权及JS-SDK → 可信域名」填写
              <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4, margin: '0 4px' }}>
                m.devlovecode.com
              </code>
              (仅域名);回调地址用下方表单的默认值即可。
            </p>
          </div>
        }
      />

      <Card title="企业微信配置">
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
            tooltip="开启后,扫码登录 / SCRM / 消息通知均依赖此凭证"
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
            extra="企业微信授权后会带 code 跳到此地址,需与可信域名一致"
            colProps={{ span: 12 }}
          />
          <ProFormTextArea
            name="extra"
            label="扩展配置"
            tooltip="JSON 格式的扩展字段,二开时用于存放额外参数"
            placeholder='{"key":"value"}'
            colProps={{ span: 24 }}
          />
          <ProFormTextArea
            name="remark"
            label="备注"
            placeholder="备注信息"
            colProps={{ span: 24 }}
          />
        </ProForm>
      </Card>
    </div>
  )
}
