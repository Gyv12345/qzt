import { useEffect, useState } from 'react'
import { App, Button, Form, Input } from 'antd'
import {
  LockOutlined,
  UserOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  BarChartOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { fetchUserInfo, login } from '../../services/auth'
import { fetchPublicConfigs } from '../../services/auth'
import './login.css'

interface LoginForm {
  username: string
  password: string
}

// 左侧品牌区的功能亮点(展示平台核心能力)
const FEATURES = [
  {
    icon: <TeamOutlined />,
    title: 'CRM 全链路',
    desc: '从线索到回款，一个系统跑完整个销售闭环',
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: '审批自动化',
    desc: '拖拽搭建审批流程，审批通过即业务生效',
  },
  {
    icon: <BarChartOutlined />,
    title: '数据驾驶舱',
    desc: '销售漏斗、财务概览、库存周转实时洞察',
  },
  {
    icon: <ApartmentOutlined />,
    title: '15 模块一体化',
    desc: '进销存 · HRM · 财务 · OA · 项目管理开箱即用',
  },
]

const TRUST_TAGS = ['开源免费', '私有化部署', '数据自主可控']

export default function Login() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [siteName, setSiteName] = useState('企业级业务管理平台')
  const [logoUrl, setLogoUrl] = useState('')

  // 拉取站点配置(站点名/Logo),用于左侧品牌区展示
  useEffect(() => {
    fetchPublicConfigs().then((cfg) => {
      const name = cfg.site_name || cfg.app_title || cfg.title
      if (name) setSiteName(name)
      if (cfg.logo_url) setLogoUrl(cfg.logo_url)
    })
  }, [])

  const onFinish = async (values: LoginForm) => {
    setLoading(true)
    try {
      await login(values.username.trim(), values.password)
      await fetchUserInfo()
      navigate('/', { replace: true })
    } catch (e) {
      message.error(e instanceof Error ? e.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-wrap">
      {/* 左侧:品牌介绍区 */}
      <aside className="login-hero">
        <span className="login-hero-glow" />
        <div className="login-hero-inner">
          <div className="login-brand">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="login-brand-mark" />
            ) : (
              <span className="login-brand-mark">企</span>
            )}
            <span className="login-brand-name">{siteName}</span>
          </div>

          <h1>让企业管理<br />回归简单</h1>
          <p className="login-slogan">
            15 个业务模块，一个平台搞定。<br />
            从客户线索到财务入账，全链路打通。
          </p>

          <div className="login-features">
            {FEATURES.map((f) => (
              <div className="login-feature" key={f.title}>
                <span className="login-feature-icon">{f.icon}</span>
                <div>
                  <div className="login-feature-title">{f.title}</div>
                  <div className="login-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="login-trust">
            {TRUST_TAGS.map((tag) => (
              <span className="login-trust-tag" key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </aside>

      {/* 右侧:登录表单 */}
      <main className="login-panel">
        <div className="login-form-box">
          <div className="login-form-title">欢迎登录</div>
          <div className="login-form-sub">请使用账号密码登录管理后台</div>

          <Form<LoginForm> size="large" onFinish={onFinish} initialValues={{ username: '', password: '' }}>
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<UserOutlined />} placeholder="用户名" autoComplete="username" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="密码" autoComplete="current-password" />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0 }}>
              <Button type="primary" htmlType="submit" block loading={loading}>
                登 录
              </Button>
            </Form.Item>
          </Form>

          <p className="login-foot">
            © {new Date().getFullYear()} {siteName}
            <br />
            私有化部署 · 数据安全可控
          </p>
        </div>
      </main>
    </div>
  )
}
