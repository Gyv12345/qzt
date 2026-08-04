import { Button, Result, Spin } from 'antd'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../stores/auth'
import { bindWecom, fetchUserInfo } from '../../services/auth'

type BindState = 'loading' | 'success' | 'failed'

/**
 * 企业微信绑定回调页。
 * 扫码后企业微信重定向回 /auth/wecom/bind?code=...&state=...,在此完成绑定。
 * 不包 RequireAuth(回调时可能尚未加载用户信息),但页面内校验 token。
 */
export default function WecomBind() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const accessToken = useAuthStore((s) => s.accessToken)
  const [state, setState] = useState<BindState>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')

  useEffect(() => {
    if (!accessToken) return
    if (!code || !stateParam) {
      setErrorMsg('回调参数缺失(code/state),请重新扫码')
      setState('failed')
      return
    }
    bindWecom({ code, state: stateParam })
      .then(async () => {
        // 绑定成功后刷新用户资料(忽略失败)
        await fetchUserInfo().catch(() => {})
        setState('success')
      })
      .catch((e) => {
        setErrorMsg(e instanceof Error ? e.message : '绑定失败,请重试')
        setState('failed')
      })
    // 只在进入页面时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken])

  if (!accessToken) {
    return (
      <Result
        status="warning"
        title="请先登录后再进行绑定"
        extra={
          <Button type="primary" onClick={() => navigate('/login', { replace: true })}>
            去登录
          </Button>
        }
      />
    )
  }

  if (state === 'loading') {
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
        <Spin size="large" />
        <span>正在完成企业微信绑定...</span>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <Result
        status="success"
        title="企业微信绑定成功"
        subTitle="后续可使用企业微信扫码登录并接收通知"
        extra={
          <Button type="primary" onClick={() => navigate('/', { replace: true })}>
            回到首页
          </Button>
        }
      />
    )
  }

  return (
    <Result
      status="error"
      title="企业微信绑定失败"
      subTitle={errorMsg}
      extra={
        <Link to="/">
          <Button type="primary">回到首页</Button>
        </Link>
      }
    />
  )
}
