import { useEffect, useState } from 'react'
import { App, Button, Card, Divider, Form, Space } from 'antd'
import { ProForm, ProFormGroup, ProFormList, ProFormSelect, ProFormText, ProFormTextArea } from '@ant-design/pro-components'
import Auth from '../../../components/Auth'
import ImageUpload from '../../../components/ImageUpload'
import { getSiteConfig, updateSiteConfig } from '../../../services/system'
import type { UpdateSiteConfigRequest } from '../../../types'

/** 数字带条目(表单态;存储为 stats_json) */
interface StatItem {
  num?: string
  label?: string
}

/** 优势网格条目(表单态;存储为 modules_json) */
interface ModuleItem {
  icon?: string
  name?: string
  desc?: string
}

type SiteFormValues = UpdateSiteConfigRequest & {
  stats_list?: StatItem[]
  modules_list?: ModuleItem[]
}

/** 模块墙可选图标(与官网前台 ICONS map 一一对应,新增图标需同步前端代码) */
const ICON_OPTIONS = [
  { label: '用户们(客户/团队)', value: 'users' },
  { label: '文件勾选(审批)', value: 'fileCheck' },
  { label: '包裹(库存/产品)', value: 'box' },
  { label: '钱包(财务)', value: 'wallet' },
  { label: '证件(人事)', value: 'idCard' },
  { label: '日历(办公)', value: 'calendar' },
  { label: '看板(项目)', value: 'kanban' },
  { label: '书本(知识)', value: 'book' },
  { label: '云(云盘)', value: 'cloud' },
  { label: '喇叭(营销)', value: 'megaphone' },
  { label: '购物袋(商城)', value: 'bag' },
  { label: '地球(网站)', value: 'globe' },
  { label: '星星(AI/亮点)', value: 'sparkles' },
]

/** 分节标题:与员工编辑等页面一致的左对齐分割线样式 */
function Section({ title, note }: { title: string; note?: string }) {
  return (
    <Divider orientation="left" orientationMargin={0}>
      {title}
      {note && <span style={{ fontSize: 12, color: '#999', fontWeight: 400, marginLeft: 8 }}>{note}</span>}
    </Divider>
  )
}

export default function SiteConfigPage() {
  const { message } = App.useApp()
  const [form] = Form.useForm<SiteFormValues>()
  const [loading, setLoading] = useState(false)

  const loadConfig = async () => {
    const res = await getSiteConfig()
    // JSON 存储字段 → 表单列表态;解析失败按空数组,不阻塞表单
    let stats: StatItem[] = []
    let modules: ModuleItem[] = []
    try {
      stats = res.stats_json ? (JSON.parse(res.stats_json) as StatItem[]) : []
    } catch {
      stats = []
    }
    try {
      modules = res.modules_json
        ? (JSON.parse(res.modules_json) as ModuleItem[]).map((m) => ({
            icon: m.icon,
            name: m.name,
            desc: m.desc,
          }))
        : []
    } catch {
      modules = []
    }
    form.setFieldsValue({ ...res, theme: res.theme || 'dark-tech', stats_list: stats, modules_list: modules })
  }

  useEffect(() => {
    loadConfig()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async (values: SiteFormValues) => {
    setLoading(true)
    try {
      // 表单列表态 → JSON 存储字段;空数组存 '[]',前台不渲染对应区块
      const stats = (values.stats_list ?? []).filter((s) => s?.num && s?.label)
      const modules = (values.modules_list ?? [])
        .filter((m) => m?.name)
        .map((m) => ({ icon: m.icon || 'users', name: m.name, desc: m.desc || '' }))
      const payload: UpdateSiteConfigRequest = Object.fromEntries(
        Object.entries({
          ...values,
          stats_json: JSON.stringify(stats),
          modules_json: JSON.stringify(modules),
        })
          // 临时表单字段不进请求
          .filter(([k]) => k !== 'stats_list' && k !== 'modules_list')
          // 空串转 undefined,避免把未填写字段覆盖为空
          .map(([k, v]) => [k, v === '' ? undefined : v]),
      )
      await updateSiteConfig(payload)
      message.success('站点信息已保存')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ display: 'flex' }}>
      <Card title="站点信息">
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
          <Section title="品牌与首页" />
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

          <Section title="官网外观与首页区块" note="控制官网整体风格与首屏营销内容" />
          <ProFormSelect
            name="theme"
            label="官网主题"
            tooltip="整套官网视觉风格,切换即全站换肤;后续会推出更多主题包"
            options={[
              { label: '深色科技(深蓝黑底 + 品牌蓝光晕)', value: 'dark-tech' },
              { label: '明亮企业(白底大留白 + 品牌蓝)', value: 'light-clean' },
            ]}
            colProps={{ span: 12 }}
          />
          <ProFormText name="cta_title" label="底部号召标题" placeholder="留空则显示 联系我们,开启合作" colProps={{ span: 12 }} />
          <ProFormText name="cta_highlight" label="号召标题高亮词" tooltip="以渐变亮色渲染的重点词,显示在主标题之后,可留空" placeholder="如 一个系统" colProps={{ span: 12 }} />
          <ProFormText name="cta_subtitle" label="底部号召副标题" placeholder="留空则显示默认引导文案" colProps={{ span: 12 }} />
          <ProFormList
            name="stats_list"
            label="首页数字带"
            tooltip="主标题下方的硬指标数字(如 13 业务模块 / 500+ 客户);全部删除则首页不显示数字带"
            colProps={{ span: 24 }}
            creatorRecord={{ num: '', label: '' }}
            creatorButtonProps={{ creatorButtonText: '添加数字', position: 'bottom' }}
            copyIconProps={false}
          >
            <ProFormGroup key="stat" grid>
              <ProFormText name="num" label="数字" placeholder="如 13 / 500+" colProps={{ span: 8 }} />
              <ProFormText name="label" label="说明" placeholder="如 业务模块一体化" colProps={{ span: 16 }} />
            </ProFormGroup>
          </ProFormList>
          <ProFormText name="modules_badge" label="优势区块徽章" placeholder="留空则显示 核心优势" colProps={{ span: 8 }} />
          <ProFormText name="modules_title" label="优势区块标题" placeholder="留空则显示 为什么选择我们" colProps={{ span: 8 }} />
          <ProFormText name="modules_desc" label="优势区块副标题" placeholder="选填" colProps={{ span: 8 }} />
          <ProFormList
            name="modules_list"
            label="首页核心优势"
            tooltip="以图标+标题+一句话展示企业优势/服务承诺(如 20年行业经验 / 自有工厂 / 48小时交付 / 质保体系);全部删除则首页不显示此区块"
            colProps={{ span: 24 }}
            creatorRecord={{ icon: 'users', name: '', desc: '' }}
            creatorButtonProps={{ creatorButtonText: '添加优势项', position: 'bottom' }}
            copyIconProps={false}
          >
            <ProFormGroup key="mod" grid>
              <ProFormSelect name="icon" label="图标" options={ICON_OPTIONS} colProps={{ span: 6 }} />
              <ProFormText name="name" label="标题" placeholder="如 20 年行业经验" colProps={{ span: 8 }} />
              <ProFormText name="desc" label="一句话描述" placeholder="如 深耕行业二十年, 服务超 500 家企业" colProps={{ span: 10 }} />
            </ProFormGroup>
          </ProFormList>

          <Section title="联系方式" note="显示在官网页脚,供客户联系" />
          <ProFormText name="contact_phone" label="联系电话" colProps={{ span: 12 }} />
          <ProFormText name="contact_email" label="联系邮箱" colProps={{ span: 12 }} />
          <ProFormText name="contact_address" label="联系地址" colProps={{ span: 12 }} />
          <ProFormText name="work_hours" label="工作时间" placeholder="如 周一至周五 9:00-18:00" colProps={{ span: 12 }} />

          <Section title="备案与版权" note="显示在官网页脚底部" />
          <ProFormText name="icp_beian" label="官网备案号" tooltip="ICP 备案号,工信部要求官网展示,如 京ICP备12345678号" placeholder="如 京ICP备12345678号" colProps={{ span: 12 }} />
          <ProFormText name="public_security_beian" label="公安备案号" placeholder="如 京公网安备11010502099999号" colProps={{ span: 12 }} />
          <ProFormText name="public_security_beian_url" label="公安备案链接" placeholder="留空则跳转公安部备案官网" colProps={{ span: 12 }} />
          <ProFormText name="copyright" label="版权信息" placeholder="留空则显示 © 年份 + 站点名称" colProps={{ span: 12 }} />

          <Section title="搜索引擎与统计" />
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

          <Section title="AI 连接地址" />
          <ProFormText
            name="mcp_url"
            label="AI 工具接入地址"
            placeholder="如 https://your-domain.com/mcp"
            tooltip="个人中心「API 密钥」页下发给 AI 工具(Claude/Cursor 等)的连接地址;私有化部署填你的域名根 + /mcp,留空则自动用当前站点地址 + /mcp"
            colProps={{ span: 24 }}
          />
        </ProForm>
      </Card>
    </Space>
  )
}
