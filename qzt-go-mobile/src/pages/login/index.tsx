import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react'
import { Dialog, Toast } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { fetchUserInfo, getWechatLoginURL, getWecomLoginQrcode, listEnabledOauth, login } from '../../services/auth'
import GradientText from '../../components/reactbits/GradientText'
import ShinyText from '../../components/reactbits/ShinyText'
import BlurText from '../../components/reactbits/BlurText'
// React Bits: Aurora(ogl) 用 lazy 拆独立 chunk, 文字组件(motion)体积小可直接引
const Aurora = lazy(() => import('../../components/reactbits/Aurora'))
import './login.css'

/** 是否在微信内置浏览器内(非企业微信) */
function isInWeChatBrowser(): boolean {
  const ua = navigator.userAgent
  return /MicroMessenger/i.test(ua) && !/wxwork/i.test(ua)
}

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [wecomEnabled, setWecomEnabled] = useState(false)
  const [wecomLoading, setWecomLoading] = useState(false)
  const [wechatEnabled, setWechatEnabled] = useState(false)
  const [wechatLoading, setWechatLoading] = useState(false)

  useEffect(() => {
    // 企微网页授权链接(open.weixin.qq.com/connect/oauth2/authorize)仅在企微内置
    // 浏览器内能静默授权,普通浏览器/个人微信打开是报错页,故只在企微内才显示按钮
    if (/wxwork/i.test(navigator.userAgent)) {
      listEnabledOauth().then((providers) => setWecomEnabled(providers.includes('wecom')))
      return
    }
    // 微信内置浏览器:显示服务号一键登录(已绑定用户静默授权直达)
    if (isInWeChatBrowser()) {
      listEnabledOauth().then((providers) => setWechatEnabled(providers.includes('wechat_mp')))
    }
  }, [])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!username.trim()) {
      Toast.show({ content: '请输入用户名' })
      return
    }
    if (!password) {
      Toast.show({ content: '请输入密码' })
      return
    }
    setLoading(true)
    try {
      await login(username.trim(), password)
      await fetchUserInfo()
      navigate('/', { replace: true })
    } catch (err) {
      Dialog.alert({
        confirmText: '知道了',
        content: err instanceof Error ? err.message : '登录失败',
      })
    } finally {
      setLoading(false)
    }
  }

  // 企业微信登录(需在企微 App 内打开才静默授权)
  const onWecomLogin = async () => {
    setWecomLoading(true)
    try {
      const { url } = await getWecomLoginQrcode('app')
      window.location.href = url
    } catch (err) {
      Dialog.alert({
        confirmText: '知道了',
        content: err instanceof Error ? err.message : '获取登录链接失败',
      })
      setWecomLoading(false)
    }
  }

  // 微信服务号一键登录(微信内置浏览器内静默授权)
  const onWechatLogin = async () => {
    setWechatLoading(true)
    try {
      const url = await getWechatLoginURL()
      window.location.href = url
    } catch (err) {
      Dialog.alert({
        confirmText: '知道了',
        content: err instanceof Error ? err.message : '获取登录链接失败',
      })
      setWechatLoading(false)
    }
  }

  return (
    <div className="qz-login">
      <div className="qz-login-grid" aria-hidden />
      {/* React Bits Aurora: 品牌色阶极光, 叠在网格底纹之上、内容之下; 无 WebGL 时静默降级 */}
      <div className="qz-login-aurora" aria-hidden>
        <Suspense fallback={null}>
          <Aurora colorStops={['#8ec0e6', '#357cbf', '#d9ebf7']} amplitude={1.1} blend={0.5} speed={0.6} />
        </Suspense>
      </div>
      <div className="qz-login-body">
        {/* 品牌区 */}
        <div className="qz-brand fade-in-up">
          <span className="qz-brand-mark">行</span>
          <span className="qz-brand-name">企业级业务管理平台</span>
        </div>

        <span className="qz-badge fade-in-up delay-100">
          <ShinyText text="行简 · 移动端" speed={3} delay={2} color="var(--brand-600)" shineColor="var(--brand-300)" />
        </span>
        <h1 className="qz-title fade-in-up delay-200">
          <GradientText as="span" colors={['#0f4c81', '#357cbf', '#8ec0e6']} animationSpeed={8}>
            业务管理平台
          </GradientText>
        </h1>
        <BlurText
          text="客户 · 商机 · 合同,尽在掌握"
          animateBy="characters"
          delay={25}
          className="qz-subtitle"
          style={{ justifyContent: 'center' }}
        />

        {/* 登录卡片 */}
        <form className="qz-card fade-in-up delay-400" onSubmit={onSubmit}>
          <label className="qz-field">
            <span className="qz-field-label">用户名</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
              autoCapitalize="off"
            />
          </label>
          <label className="qz-field">
            <span className="qz-field-label">密码</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="qz-submit" disabled={loading}>
            {loading ? '登录中…' : '登 录'}
          </button>

          {wecomEnabled && (
            <>
              <div className="qz-divider">
                <span>其他登录方式</span>
              </div>
              <button
                type="button"
                className="qz-wecom-btn"
                onClick={onWecomLogin}
                disabled={wecomLoading}
              >
                {wecomLoading ? '跳转中…' : '企业微信登录'}
              </button>
            </>
          )}

          {wechatEnabled && (
            <>
              <div className="qz-divider">
                <span>其他登录方式</span>
              </div>
              <button
                type="button"
                className="qz-wecom-btn"
                onClick={onWechatLogin}
                disabled={wechatLoading}
              >
                {wechatLoading ? '跳转中…' : '微信一键登录'}
              </button>
            </>
          )}
        </form>

        <p className="qz-foot fade-in-up delay-500">行简 · 企业级业务管理平台</p>
      </div>
    </div>
  )
}
