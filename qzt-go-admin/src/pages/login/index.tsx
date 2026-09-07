import { useEffect, useRef, useState } from 'react'
import { App, Button, Checkbox, Form, Input, Spin } from 'antd'
import { WechatOutlined } from '@ant-design/icons'
import { QRCodeSVG } from 'qrcode.react'
import { useNavigate } from 'react-router-dom'
import {
  fetchPublicConfigs,
  fetchUserInfo,
  getWecomLoginQrcode,
  listEnabledOauth,
  login,
  pollWecomLoginStatus,
} from '../../services/auth'
import { useAuthStore } from '../../stores/auth'
import type { LoginResult } from '../../types'
import './login.css'

interface LoginForm {
  username: string
  password: string
  remember?: boolean
}

type ScanStatus = 'loading' | 'waiting' | 'expired'

/** 记住登录:仅记住用户名(密码不落盘) */
const REMEMBER_KEY = 'qzt-go-admin:remember-username'

/** 品牌区底部能力关键词(与原型一致) */
const KEYWORDS = ['CRM', 'OA 协同', '进销存', '人事 HR', '财务管理']

export default function Login() {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [errText, setErrText] = useState('')
  const [siteName, setSiteName] = useState('企业级业务管理平台')
  const [logoUrl, setLogoUrl] = useState('')
  const [icp, setIcp] = useState('')
  const [beian, setBeian] = useState('')
  const rememberedUsername = localStorage.getItem(REMEMBER_KEY) ?? ''

  // 企业微信扫码登录(登录卡内切换展示,与原型交互一致)
  const [wecomEnabled, setWecomEnabled] = useState(false)
  const [scanOpen, setScanOpen] = useState(false)
  const [qrUrl, setQrUrl] = useState('')
  const [scanStatus, setScanStatus] = useState<ScanStatus>('loading')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  // 拉取站点配置 + 检查企微登录是否启用
  useEffect(() => {
    fetchPublicConfigs().then((cfg) => {
      const name = cfg.site_name || cfg.app_title || cfg.title
      if (name) setSiteName(name)
      if (cfg.logo_url) setLogoUrl(cfg.logo_url)
      setIcp(cfg.icp_beian || '')
      setBeian(cfg.public_security_beian || '')
    })
    listEnabledOauth().then((providers) => setWecomEnabled(providers.includes('wecom')))
    return () => stopPolling()
  }, [])

  const onFinish = async (values: LoginForm) => {
    setErrText('')
    if (values.remember) {
      localStorage.setItem(REMEMBER_KEY, values.username.trim())
    } else {
      localStorage.removeItem(REMEMBER_KEY)
    }
    setLoading(true)
    try {
      await login(values.username.trim(), values.password)
      await fetchUserInfo()
      navigate('/', { replace: true })
    } catch (e) {
      setErrText(e instanceof Error ? e.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const startPolling = (state: string) => {
    let count = 0
    pollRef.current = setInterval(async () => {
      count += 1
      if (count > 150) {
        // 5 分钟(150 次 × 2s)超时
        stopPolling()
        setScanStatus('expired')
        return
      }
      try {
        const res = await pollWecomLoginStatus(state)
        if (res.status === 'success' && res.access_token && res.refresh_token) {
          stopPolling()
          useAuthStore.getState().setTokens({
            access_token: res.access_token,
            refresh_token: res.refresh_token,
            access_expire: res.access_expire ?? 0,
          } as LoginResult)
          await fetchUserInfo()
          setScanOpen(false)
          message.success('登录成功')
          navigate('/', { replace: true })
        } else if (res.status === 'expired') {
          stopPolling()
          setScanStatus('expired')
        } else if (res.status === 'error') {
          stopPolling()
          setScanOpen(false)
          message.error(res.message || '登录失败')
        }
      } catch {
        // 单次轮询失败忽略,继续等待
      }
    }, 2000)
  }

  const openWecomScan = async () => {
    setScanOpen(true)
    setScanStatus('loading')
    setQrUrl('')
    stopPolling()
    try {
      const { url, state } = await getWecomLoginQrcode('scan')
      setQrUrl(url)
      setScanStatus('waiting')
      startPolling(state)
    } catch (e) {
      message.error(e instanceof Error ? e.message : '获取二维码失败')
      setScanOpen(false)
    }
  }

  const closeScan = () => {
    stopPolling()
    setScanOpen(false)
  }

  return (
    <div className="login-wrap">
      {/* 左侧:亮蓝品牌区(网格 + 节点圆 + 连线装饰,与原型一致) */}
      <aside className="login-hero">
        <div className="login-hero-grid" aria-hidden="true" />
        <div
          className="login-hero-node"
          style={{ width: 220, height: 220, right: '8%', top: '12%' }}
          aria-hidden="true"
        />
        <div
          className="login-hero-node"
          style={{ width: 120, height: 120, right: '24%', top: '34%', background: 'rgba(255,255,255,.08)' }}
          aria-hidden="true"
        />
        <div
          className="login-hero-node"
          style={{ width: 64, height: 64, right: '18%', top: '28%', background: 'rgba(255,255,255,.2)' }}
          aria-hidden="true"
        />
        <svg className="login-hero-lines" viewBox="0 0 900 900" preserveAspectRatio="none" aria-hidden="true">
          <path d="M120 760 L300 620 L520 680 L760 480" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" fill="none" />
          <path d="M180 300 L360 420 L560 340 L780 460" stroke="rgba(255,255,255,.16)" strokeWidth="1.5" fill="none" />
          <circle cx="300" cy="620" r="4" fill="rgba(255,255,255,.5)" />
          <circle cx="520" cy="680" r="4" fill="rgba(255,255,255,.5)" />
          <circle cx="360" cy="420" r="4" fill="rgba(255,255,255,.4)" />
          <circle cx="560" cy="340" r="4" fill="rgba(255,255,255,.4)" />
        </svg>

        <div className="login-hero-logo">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="login-hero-mark" />
          ) : (
            <span className="login-hero-mark">企</span>
          )}
          <span className="login-hero-name">{siteName}</span>
        </div>

        <div className="login-hero-content">
          <h1>
            把 CRM、OA、进销存、人事、财务
            <br />
            装进同一个后台
          </h1>
          <p className="login-hero-slogan">一站式企业业务管理平台 · 专业、可信、高效</p>
        </div>

        <div className="login-hero-kw">
          {KEYWORDS.map((k) => (
            <span key={k}>{k}</span>
          ))}
        </div>
      </aside>

      {/* 右侧:登录卡 */}
      <main className="login-panel">
        <div className="login-form-box">
          <div className="login-form-title">欢迎登录</div>
          <div className="login-form-sub">请使用企业账号登录工作台</div>

          {!scanOpen ? (
            <>
              <div className={errText ? 'login-err show' : 'login-err'} role="alert">
                {errText}
              </div>
              <Form<LoginForm>
                size="large"
                initialValues={{ username: rememberedUsername, password: '', remember: true }}
                onFinish={onFinish}
              >
                <Form.Item name="username" rules={[{ required: true, message: '请输入账号' }]} style={{ marginBottom: 16 }}>
                  <Input placeholder="账号" autoComplete="username" />
                </Form.Item>
                <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]} style={{ marginBottom: 4 }}>
                  <Input.Password placeholder="密码" autoComplete="current-password" />
                </Form.Item>
                <div className="login-aux">
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox>记住登录</Checkbox>
                  </Form.Item>
                  <Button
                    type="link"
                    size="small"
                    style={{ padding: 0, height: 'auto' }}
                    onClick={() => message.info('请联系企业管理员重置密码')}
                  >
                    忘记密码？
                  </Button>
                </div>
                <Button type="primary" htmlType="submit" block size="large" style={{ height: 42 }} loading={loading}>
                  登 录
                </Button>
              </Form>

              {wecomEnabled && (
                <>
                  <div className="login-div">或</div>
                  <Button block size="large" style={{ height: 42, fontSize: 14 }} onClick={openWecomScan}>
                    <WechatOutlined style={{ color: '#07c160', fontSize: 18 }} />
                    企业微信扫码登录
                  </Button>
                </>
              )}
            </>
          ) : (
            <div className="login-qr">
              {scanStatus === 'loading' && (
                <div style={{ padding: '32px 0' }}>
                  <Spin />
                  <p className="login-qr-tip">正在生成二维码...</p>
                </div>
              )}
              {scanStatus === 'waiting' && qrUrl && (
                <>
                  <QRCodeSVG value={qrUrl} size={200} style={{ marginTop: 8 }} />
                  <p className="login-qr-tip">请使用企业微信「扫一扫」</p>
                </>
              )}
              {scanStatus === 'expired' && (
                <>
                  <p style={{ color: '#999', margin: '24px 0' }}>二维码已过期</p>
                  <Button type="primary" onClick={openWecomScan}>
                    刷新二维码
                  </Button>
                </>
              )}
              <Button type="text" style={{ marginTop: 8 }} onClick={closeScan}>
                返回账号登录
              </Button>
            </div>
          )}

          <p className="login-foot">
            © {new Date().getFullYear()} {siteName}
            <br />
            {icp || beian ? [icp, beian].filter(Boolean).join(' · ') : '私有化部署 · 数据安全可控'}
          </p>
        </div>
      </main>
    </div>
  )
}
