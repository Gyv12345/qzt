import { useEffect, useState } from 'react'
import { Button, Result, Spin } from 'antd'
import { useNavigate } from 'react-router-dom'
import { fetchUserInfo } from '../../../services/auth'
import { useAuthStore } from '../../../stores/auth'

/**
 * 第三方扫码登录回调页(公开路由 /oauth/callback,与 /login 同级、RequireAuth 外)。
 *
 * 钉钉/飞书扫码后由后端回调 302 到 `/#/oauth/callback?token=...`(hash 形式,
 * router/index.tsx 模块加载期已归一为路径路由);本页解析 token → 照登录成功
 * 手法写入凭据(useAuthStore.setTokens + fetchUserInfo)→ 跳工作台。
 */
export default function OauthCallback() {
  const navigate = useNavigate()
  const [failed, setFailed] = useState('')

  useEffect(() => {
    const readParams = (search: string): { token: string; refreshToken: string; expire: number } => {
      const p = new URLSearchParams(search)
      return {
        token: p.get('token') || '',
        refreshToken: p.get('refresh_token') || '',
        expire: Number(p.get('access_expire') || 0),
      }
    }
    let { token, refreshToken, expire } = readParams(window.location.search)
    // 兜底:路由归一未生效时直接从 hash(#/oauth/callback?token=...)里解析
    if (!token && window.location.hash.includes('oauth/callback')) {
      const qi = window.location.hash.indexOf('?')
      if (qi >= 0) {
        ;({ token, refreshToken, expire } = readParams(window.location.hash.slice(qi)))
      }
    }
    if (!token) {
      setFailed('回调参数缺失 token,请返回重新扫码登录')
      return
    }
    useAuthStore.getState().setTokens({
      access_token: token,
      refresh_token: refreshToken,
      access_expire: Number.isFinite(expire) ? expire : 0,
      user_id: 0,
      username: '',
      nickname: '',
    })
    fetchUserInfo()
      .then(() => {
        // replace 替换当前历史记录,避免 token 残留在地址栏
        navigate('/dashboard', { replace: true })
      })
      .catch(() => {
        useAuthStore.getState().clearAuth()
        setFailed('登录信息加载失败,请返回重新登录')
      })
  }, [navigate])

  if (failed) {
    return (
      <Result
        status="error"
        title="扫码登录未完成"
        subTitle={failed}
        extra={
          <Button type="primary" onClick={() => navigate('/login', { replace: true })}>
            返回登录
          </Button>
        }
      />
    )
  }
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Spin size="large" />
    </div>
  )
}
