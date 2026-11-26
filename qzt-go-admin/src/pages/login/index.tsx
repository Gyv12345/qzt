import { Component, lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { App, Button, Checkbox, Form, Input, Spin } from 'antd'
import { DingtalkOutlined, WechatOutlined } from '@ant-design/icons'
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
import BlurText from '../../components/reactbits/BlurText'
import GradientText from '../../components/reactbits/GradientText'
import ShinyText from '../../components/reactbits/ShinyText'
// React Bits: Aurora(ogl) 用 lazy 拆独立 chunk, 文字组件(motion)体积小可直接引
const Aurora = lazy(() => import('../../components/reactbits/Aurora'))
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

/** 钉钉/飞书扫码登录入口:后端 302 到对应平台扫码页,扫码回调后回到 /#/oauth/callback */
const DINGTALK_QR_URL = '/prod-api/enterprise/oauth/dingtalk/qr'
const FEISHU_QR_URL = '/prod-api/enterprise/oauth/feishu/qr'

/** 飞书品牌图标(@ant-design/icons 无内置,取自字节 IconPark「Lark」轮廓标,currentColor 填充) */
function FeishuIcon({ style }: { style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 48 48" width="1em" height="1em" style={style} aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M41.072 5.994L3.31 16.52l9.075 9.294l8.414.146l9.683-9.44q-.384-.787-.384-1.318c0-.794.311-1.422.796-1.868q1.244-1.145 2.994-.342zm1.03.734L31.578 44.49l-9.294-9.075L22.137 27l9.375-9.518a2.54 2.54 0 0 0 1.664.495c.902-.05 1.485-.596 1.759-.917a2.35 2.35 0 0 0 .567-1.649a2.57 2.57 0 0 0-.52-1.464z"
      />
    </svg>
  )
}

/**
 * chunk 级错误边界: Aurora 懒加载 chunk 失败(如重新部署后旧 index.html 引用旧 hash chunk)时
 * 渲染 null 静默降级, 避免纯装饰背景失败卸载整棵登录树导致白屏。
 */
class ChunkErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

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

  // 第三方扫码登录渠道(登录卡内切换展示;企微出码轮询,钉钉/飞书跳平台扫码页)
  const [providers, setProviders] = useState<string[]>([])
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

  // 拉取站点配置 + 检查已启用的第三方扫码渠道(企微/钉钉/飞书)
  useEffect(() => {
    fetchPublicConfigs().then((cfg) => {
      const name = cfg.site_name || cfg.app_title || cfg.title
      if (name) setSiteName(name)
      if (cfg.logo_url) setLogoUrl(cfg.logo_url)
      setIcp(cfg.icp_beian || '')
      setBeian(cfg.public_security_beian || '')
    })
    listEnabledOauth().then(setProviders)
    return () => stopPolling()
  }, [])

  const wecomEnabled = providers.includes('wecom')
  const dingtalkEnabled = providers.includes('dingtalk')
  const feishuEnabled = providers.includes('feishu')

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
        {/* React Bits Aurora: 弱化极光叠在品牌渐变上(蓝系 hex 浅深通用; 无 WebGL 时为空) */}
        <div className="login-hero-aurora" aria-hidden="true">
          <ChunkErrorBoundary>
            <Suspense fallback={null}>
              <Aurora colorStops={['#597ef7', '#1d39c4', '#2f54eb']} amplitude={0.9} blend={0.5} speed={0.5} />
            </Suspense>
          </ChunkErrorBoundary>
        </div>
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
            {/* React Bits BlurText: 中文按字符 stagger 入场(两行错落) */}
            <BlurText
              text="把 CRM、OA、进销存、人事、财务"
              animateBy="characters"
              delay={30}
              className="login-hero-line"
            />
            <BlurText text="装进同一个后台" animateBy="characters" delay={45} className="login-hero-line" />
          </h1>
          <p className="login-hero-slogan">
            <ShinyText
              text="一站式企业业务管理平台 · 专业、可信、高效"
              speed={3}
              delay={2}
              color="rgba(255,255,255,0.85)"
              shineColor="#ffffff"
            />
          </p>
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
          <div className="login-form-title">
            {/* React Bits GradientText: 标题流动渐变(品牌蓝, as="span" 适配行内标题) */}
            <GradientText as="span" colors={['#2f54eb', '#1677ff', '#8ec0e6']} animationSpeed={6}>
              欢迎登录
            </GradientText>
          </div>
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

              {(wecomEnabled || dingtalkEnabled || feishuEnabled) && <div className="login-div">或</div>}
              {wecomEnabled && (
                <Button
                  block
                  size="large"
                  style={{ height: 42, fontSize: 14, marginBottom: dingtalkEnabled || feishuEnabled ? 8 : 0 }}
                  onClick={openWecomScan}
                >
                  <WechatOutlined style={{ color: '#07c160', fontSize: 18 }} />
                  企业微信扫码登录
                </Button>
              )}
              {dingtalkEnabled && (
                <Button
                  block
                  size="large"
                  title="跳转钉钉扫码页登录;平台未配置时后端会返回明确错误提示"
                  style={{ height: 42, fontSize: 14, marginBottom: feishuEnabled ? 8 : 0 }}
                  onClick={() => {
                    window.location.href = DINGTALK_QR_URL
                  }}
                >
                  <DingtalkOutlined style={{ color: '#0089ff', fontSize: 18 }} />
                  钉钉扫码登录
                </Button>
              )}
              {feishuEnabled && (
                <Button
                  block
                  size="large"
                  title="跳转飞书扫码页登录;平台未配置时后端会返回明确错误提示"
                  style={{ height: 42, fontSize: 14 }}
                  onClick={() => {
                    window.location.href = FEISHU_QR_URL
                  }}
                >
                  <FeishuIcon style={{ color: '#3370ff', fontSize: 18 }} />
                  飞书扫码登录
                </Button>
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
                  <p style={{ color: 'var(--ant-color-text-tertiary)', margin: '24px 0' }}>二维码已过期</p>
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
