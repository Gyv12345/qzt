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
    title: 'CRM 客户全生命周期',
    desc: '线索、公海、商机、合同、回款一体化管理',
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: '可视化审批流设计',
    desc: '拖拽搭建企业审批流程,支持会签与条件分支',
  },
  {
    icon: <BarChartOutlined />,
    title: 'BI 数据看板',
    desc: '销售趋势、商机漏斗、财务概览实时可视化',
  },
  {
    icon: <ApartmentOutlined />,
    title: '进销存 · HRM · 财务',
    desc: '模块自由组合,数据私有化部署',
  },
]

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
        <div className="login-hero-inner">
          <div className="login-brand">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="login-brand-mark" />
            ) : (
              <span className="login-brand-mark">企</span>
            )}
            <span className="login-brand-name">{siteName}</span>
          </div>

          <h1>一站式企业管理平台</h1>
          <p className="login-slogan">
            私有化部署,数据完全归企业所有。CRM、审批流、进销存、财务、HRM、官网 CMS 全套模块,开箱即用。
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
