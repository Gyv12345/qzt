import { useEffect, useState } from 'react'
import { App, Button, Card, Form, Space } from 'antd'
import { ProForm, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import ImageUpload from '../../../components/ImageUpload'
import { getSiteConfig, updateSiteConfig } from '../../../services/system'
import type { UpdateSiteConfigRequest } from '../../../types'

type SiteFormValues = UpdateSiteConfigRequest

export default function SiteConfigPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<SiteFormValues>()
  const [loading, setLoading] = useState(false)

  const loadConfig = async () => {
    const res = await getSiteConfig()
    form.setFieldsValue({ ...res })
  }

  useEffect(() => {
    loadConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (values: SiteFormValues) => {
    setLoading(true)
    try {
      // 空串转 undefined,避免把未填写字段覆盖为空
      const payload: UpdateSiteConfigRequest = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, v === '' ? undefined : v]),
      )
      await updateSiteConfig(payload)
      message.success('站点信息已保存')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex', maxWidth: 960 }}>
      <Card title="基本信息">
        <ProForm<SiteFormValues>
          form={form}
          grid
          onFinish={handleSave}
          submitter={{
            render: () => (
              <Auth perm="system:site:save">
                <Button type="primary" loading={loading} onClick={() => form.submit()}>
                  保存
                </Button>
              </Auth>
            ),
          }}
        >
          <ProFormText name="site_name" label="站点名称" colProps={{ span: 12 }} />
          <ProFormText name="slogan" label="标语" colProps={{ span: 12 }} />
          <ProFormText name="hero_badge" label="首页标签" placeholder="如 企业级业务管理平台" colProps={{ span: 12 }} />
          <ProFormText name="hero_title" label="首页大标题" placeholder="留空则用站点名称" colProps={{ span: 24 }} />
          <ProFormTextArea name="hero_subtitle" label="首页副标题" placeholder="留空则用站点描述" colProps={{ span: 24 }} />
          <ProForm.Item name="logo_url" label="Logo" colProps={{ span: 12 }}>
            <ImageUpload folder="site" />
          </ProForm.Item>
          <ProForm.Item name="favicon_url" label="Favicon" colProps={{ span: 12 }}>
            <ImageUpload folder="site" accept="image/x-icon,image/png" />
          </ProForm.Item>
          <ProFormTextArea name="description" label="站点描述" colProps={{ span: 24 }} />
          <ProFormTextArea
            name="keywords"
            label="SEO 关键词"
            placeholder="多个关键词用英文逗号分隔"
            colProps={{ span: 24 }}
          />

          <ProFormText name="contact_phone" label="联系电话" colProps={{ span: 12 }} />
          <ProFormText name="contact_email" label="联系邮箱" colProps={{ span: 12 }} />
          <ProFormText name="contact_address" label="联系地址" colProps={{ span: 12 }} />
          <ProFormText name="work_hours" label="工作时间" colProps={{ span: 12 }} />
          <ProFormText name="contact_qq" label="QQ" colProps={{ span: 12 }} />
          <ProFormText name="contact_wechat" label="微信号" colProps={{ span: 12 }} />

          <ProFormText name="weibo_url" label="微博链接" colProps={{ span: 12 }} />
          <ProForm.Item name="wechat_qr_url" label="微信二维码" colProps={{ span: 12 }}>
            <ImageUpload folder="site" />
          </ProForm.Item>
          <ProFormText name="linkedin_url" label="LinkedIn 链接" colProps={{ span: 12 }} />
          <ProFormText name="copyright" label="版权信息" colProps={{ span: 12 }} />

          <ProFormText name="icp_beian" label="ICP 备案号" colProps={{ span: 12 }} />
          <ProFormText name="public_security_beian" label="公安备案号" colProps={{ span: 12 }} />
          <ProFormText
            name="public_security_beian_url"
            label="公安备案链接"
            colProps={{ span: 12 }}
          />
          <ProFormTextArea
            name="analytics_code"
            label="统计代码"
            placeholder="第三方统计/埋点脚本"
            colProps={{ span: 24 }}
          />
          <ProFormText
            name="mcp_url"
            label="MCP 服务地址"
            placeholder="如 https://your-domain.com/mcp"
            tooltip="个人中心 API Key 页下发给 MCP 客户端(Claude/Cursor 等)的连接地址;私有化部署填你的域名根 + /mcp,留空则前端用当前站点 origin + /mcp"
            colProps={{ span: 24 }}
          />
        </ProForm>
      </Card>
    </Space>
  )
}
