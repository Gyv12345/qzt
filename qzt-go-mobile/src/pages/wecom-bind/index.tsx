import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ErrorBlock, SpinLoading } from 'antd-mobile'

type Phase = 'loading' | 'redirecting' | 'success' | 'failed'

/**
 * 企业微信绑定回调页(公开,无需登录态)。
 *
 * 两阶段流程(解决企业微信扫码拦截 OAuth URL 的问题):
 * 阶段1 — 只有 state,没有 code → 从后端获取 OAuth URL → JS 跳转(在企微浏览器内部触发,不被拦截)
 * 阶段2 — 有 code + state → POST 到后端完成绑定 → 显示结果
 */
export default function WecomBind() {
  const [searchParams] = useSearchParams()
  const [phase, setPhase] = useState<Phase>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const code = searchParams.get('code')
  const state = searchParams.get('state')

  useEffect(() => {
    if (!state) {
      setErrorMsg('参数缺失，请重新扫码')
      setPhase('failed')
      return
    }

    // 阶段2: 有 code → 完成绑定
    if (code) {
      setPhase('loading')
      fetch('/prod-api/system/auth/wecom/bind-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.code === 0) {
            setPhase('success')
          } else {
            setErrorMsg(d.msg || '绑定失败')
            setPhase('failed')
          }
        })
        .catch((e) => {
          setErrorMsg(e.message || '网络错误')
          setPhase('failed')
        })
      return
    }

    // 阶段1: 无 code → 获取 OAuth URL 并跳转
    setPhase('redirecting')
    fetch(`/prod-api/system/auth/wecom/bind-oauth-url?state=${encodeURIComponent(state)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.code === 0 && d.data?.url) {
          window.location.href = d.data.url
        } else {
          setErrorMsg(d.msg || '获取授权链接失败')
          setPhase('failed')
        }
      })
      .catch((e) => {
        setErrorMsg(e.message || '网络错误')
        setPhase('failed')
      })
  }, [])

  if (phase === 'success') {
    return (
      <div style={{ paddingTop: '30vh', textAlign: 'center', padding: '0 24px' }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontSize: 20, fontWeight: 600 }}>企业微信绑定成功</h2>
        <p style={{ color: '#999', marginTop: 8 }}>请回到电脑端查看绑定状态</p>
      </div>
    )
  }

  if (phase === 'failed') {
    return (
      <div style={{ paddingTop: '20vh', padding: '0 24px' }}>
        <ErrorBlock status="default" title="企业微信绑定失败" description={errorMsg} />
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
      <span style={{ color: '#999' }}>
        {phase === 'redirecting' ? '正在跳转企业微信授权...' : '正在完成绑定...'}
      </span>
    </div>
  )
}
