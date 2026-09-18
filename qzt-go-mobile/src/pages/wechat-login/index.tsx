import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorBlock, SpinLoading, Toast } from 'antd-mobile'
import { fetchUserInfo, wechatBind } from '../../services/auth'
import { useAuthStore } from '../../stores/auth'
import type { LoginResult } from '../../types'

type Phase = 'loading' | 'bindDone' | 'failed'

/**
 * 微信服务号 OAuth 回调页(公开路由,无需登录态)。
 *
 * state 以 wxb_ 开头 = 绑定流程(用户已登录,JWT 在本地):携 code/state 调绑定接口后回绑定页。
 * 其余 state = 免登录流程:携 code 换 token,写入后跳首页。
 */
export default function WechatLogin() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const code = searchParams.get('code')
  const state = searchParams.get('state') || ''

  useEffect(() => {
    if (!code) {
      setErrorMsg('参数缺失,请重新发起')
      setPhase('failed')
      return
    }
    const isBind = state.startsWith('wxb_')

    if (isBind) {
      wechatBind(code, state)
        .then(() => {
          Toast.show({ icon: 'success', content: '微信绑定成功' })
          navigate('/wechat-bind', { replace: true })
        })
        .catch((e) => {
          setErrorMsg(e instanceof Error ? e.message : '绑定失败')
          setPhase('failed')
        })
      return
    }

    fetch('/prod-api/system/auth/wechat/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then((r) => r.json())
      .then(async (d) => {
        if (d.code !== 0) {
          setErrorMsg(d.msg || '登录失败')
          setPhase('failed')
          return
        }
        useAuthStore.getState().setTokens(d.data as LoginResult)
        await fetchUserInfo()
        navigate('/', { replace: true })
      })
      .catch((e) => {
        setErrorMsg(e instanceof Error ? e.message : '网络错误')
        setPhase('failed')
      })
  }, [])

  if (phase === 'bindDone') {
    return (
      <div style={{ paddingTop: '30vh', textAlign: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>绑定成功</h2>
      </div>
    )
  }

  if (phase === 'failed') {
    return (
      <div style={{ paddingTop: '20vh', padding: '0 24px' }}>
        <ErrorBlock status="default" title="微信授权失败" description={errorMsg} />
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
    >
      <SpinLoading style={{ '--size': '48px' }} />
      <span style={{ color: '#999' }}>正在处理...</span>
    </div>
  )
}
