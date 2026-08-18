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

  const saveButton = (
    <Auth perm="system:site:save">
      <Button type="primary" loading={loading} onClick={() => form.submit()}>
        保存
      </Button>
    </Auth>
  )

  return (
    <ProForm<SiteFormValues>
      form={form}
      grid
      onFinish={handleSave}
      submitter={{ render: () => saveButton }}
    >
      <Space direction="vertical" size={16} style={{ display: 'flex', maxWidth: 960 }}>
        <Card title="品牌与首页" styles={{ body: { paddingTop: 8 } }}>
          <ProFormText name="site_name" label="站点名称" tooltip="企业/产品名,显示在官网页眉页脚、浏览器标签和后台登录页" colProps={{ span: 12 }} />
          <ProForm.Item name="logo_url" label="网站 Logo" tooltip="官网页眉/页脚展示;后台顶栏和登录页也会自动使用" colProps={{ span: 12 }}>
            <ImageUpload folder="site" />
          </ProForm.Item>
          <ProForm.Item name="favicon_url" label="网站图标" tooltip="浏览器标签页上显示的小图标,建议正方形 PNG/ICO;留空则用 Logo" colProps={{ span: 12 }}>
            <ImageUpload folder="site" accept="image/x-icon,image/png" />
          </ProForm.Item>
          <ProFormText name="hero_badge" label="首页小标签" placeholder="如 私有化部署 · 数据归企业所有" colProps={{ span: 12 }} />
          <ProFormText name="hero_title" label="首页主标题" placeholder="留空则用站点名称" colProps={{ span: 24 }} />
          <ProFormTextArea name="hero_subtitle" label="首页副标题" placeholder="留空则用站点描述" colProps={{ span: 24 }} />
        </Card>

        <Card title="联系方式" styles={{ body: { paddingTop: 8 } }} extra="显示在官网页脚,供客户联系">
          <ProFormText name="contact_phone" label="联系电话" colProps={{ span: 12 }} />
          <ProFormText name="contact_email" label="联系邮箱" colProps={{ span: 12 }} />
          <ProFormText name="contact_address" label="联系地址" colProps={{ span: 12 }} />
          <ProFormText name="work_hours" label="工作时间" placeholder="如 周一至周五 9:00-18:00" colProps={{ span: 12 }} />
        </Card>

        <Card title="备案与版权" styles={{ body: { paddingTop: 8 } }} extra="显示在官网页脚底部">
          <ProFormText name="icp_beian" label="官网备案号" tooltip="ICP 备案号,工信部要求官网展示,如 京ICP备12345678号" placeholder="如 京ICP备12345678号" colProps={{ span: 12 }} />
          <ProFormText name="public_security_beian" label="公安备案号" placeholder="如 京公网安备11010502099999号" colProps={{ span: 12 }} />
          <ProFormText name="public_security_beian_url" label="公安备案链接" placeholder="留空则跳转公安部备案官网" colProps={{ span: 24 }} />
          <ProFormText name="copyright" label="版权信息" placeholder="留空则显示 © 年份 + 站点名称" colProps={{ span: 24 }} />
        </Card>

        <Card title="搜索引擎与统计" styles={{ body: { paddingTop: 8 } }}>
          <ProFormTextArea name="description" label="站点描述" tooltip="搜索结果页里展示的网站简介,建议 80-120 字" colProps={{ span: 24 }} />
          <ProFormTextArea
            name="keywords"
            label="搜索关键词"
            tooltip="帮助搜索引擎理解网站主题,多个关键词用英文逗号分隔"
            placeholder="如 企业管理平台,客户管理,进销存"
            colProps={{ span: 24 }}
          />
          <ProFormTextArea
            name="analytics_code"
            label="统计代码"
            tooltip="第三方统计/埋点脚本(如百度统计、Google Analytics 的 <script> 代码),会自动注入官网每个页面"
            placeholder="粘贴第三方统计的 <script> 代码"
            colProps={{ span: 24 }}
          />
        </Card>

        <Card title="AI 连接地址" styles={{ body: { paddingTop: 8 } }}>
          <ProFormText
            name="mcp_url"
            label="AI 工具接入地址"
            placeholder="如 https://your-domain.com/mcp"
            tooltip="个人中心「API 密钥」页下发给 AI 工具(Claude/Cursor 等)的连接地址;私有化部署填你的域名根 + /mcp,留空则自动用当前站点地址 + /mcp"
            colProps={{ span: 24 }}
          />
        </Card>
      </Space>
    </ProForm>
  )
}
