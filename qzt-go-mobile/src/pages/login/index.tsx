import { useEffect, useState, type FormEvent } from 'react'
import { Dialog, Toast } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { fetchUserInfo, getWecomLoginQrcode, listEnabledOauth, login } from '../../services/auth'
import './login.css'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [wecomEnabled, setWecomEnabled] = useState(false)
  const [wecomLoading, setWecomLoading] = useState(false)

  useEffect(() => {
    listEnabledOauth().then((providers) => setWecomEnabled(providers.includes('wecom')))
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

  return (
    <div className="qz-login">
      <div className="qz-login-grid" aria-hidden />
      <div className="qz-login-body">
        {/* 品牌区 */}
        <div className="qz-brand fade-in-up">
          <span className="qz-brand-mark">企</span>
          <span className="qz-brand-name">企业级业务管理平台</span>
        </div>

        <span className="qz-badge fade-in-up delay-100">企智通 · 移动端</span>
        <h1 className="qz-title fade-in-up delay-200">业务管理平台</h1>
        <p className="qz-subtitle fade-in-up delay-300">客户 · 商机 · 合同,尽在掌握</p>

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
        </form>

        <p className="qz-foot fade-in-up delay-500">企智通 · 企业级业务管理平台</p>
      </div>
    </div>
  )
}
