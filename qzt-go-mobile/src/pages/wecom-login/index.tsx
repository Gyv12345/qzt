import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorBlock, SpinLoading } from 'antd-mobile'
import { fetchUserInfo } from '../../services/auth'
import { useAuthStore } from '../../stores/auth'
import type { LoginResult } from '../../types'

type Phase = 'loading' | 'scanDone' | 'failed'

/**
 * 企业微信扫码登录回调页(公开,无需登录态)。
 *
 * 同步模式(手机企微内点「企业微信登录」发起):直接拿到 token,写入后跳首页。
 * 轮询模式(桌面端出码、手机扫码,state 以 login_ 开头):后端已把 token 存 Redis 供 PC 轮询,
 *   这里仅提示用户回到电脑端,不在手机端登录。
 */
export default function WecomLogin() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const code = searchParams.get('code')
  const state = searchParams.get('state')

  useEffect(() => {
    if (!code || !state) {
      setErrorMsg('参数缺失，请重新发起登录')
      setPhase('failed')
      return
    }
    fetch('/prod-api/system/auth/wecom/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, state }),
    })
      .then((r) => r.json())
      .then(async (d) => {
        if (d.code !== 0) {
          setErrorMsg(d.msg || '登录失败')
          setPhase('failed')
          return
        }
        // 桌面端轮询模式:token 已存 Redis 供 PC 轮询,提示用户回电脑端
        if (d.data?.scan_login) {
          setPhase('scanDone')
          return
        }
        // 同步模式:直接拿到 token,写入并跳首页
        useAuthStore.getState().setTokens(d.data as LoginResult)
        await fetchUserInfo()
        navigate('/', { replace: true })
      })
      .catch((e) => {
        setErrorMsg(e instanceof Error ? e.message : '网络错误')
        setPhase('failed')
      })
  }, [])

  if (phase === 'scanDone') {
    return (
      <div style={{ paddingTop: '30vh', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>登录成功</h2>
        <p style={{ color: '#999', marginTop: 8 }}>请回到电脑端查看</p>
      </div>
    )
  }

  if (phase === 'failed') {
    return (
      <div style={{ paddingTop: '20vh', padding: '0 24px' }}>
        <ErrorBlock status="default" title="企业微信登录失败" description={errorMsg} />
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
      <span style={{ color: '#999' }}>正在登录...</span>
    </div>
  )
}
