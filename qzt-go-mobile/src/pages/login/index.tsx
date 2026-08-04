import { useState, type FormEvent } from 'react'
import { Toast } from 'antd-mobile'
import { useNavigate } from 'react-router-dom'
import { fetchUserInfo, login } from '../../services/auth'
import './login.css'

export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

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
      Toast.show({ icon: 'fail', content: err instanceof Error ? err.message : '登录失败' })
    } finally {
      setLoading(false)
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

        <span className="qz-badge fade-in-up delay-100">QZT · MOBILE TERMINAL</span>
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
        </form>

        <p className="qz-foot fade-in-up delay-500">QZT-GO-SERVER · JWT SECURED</p>
      </div>
    </div>
  )
}
