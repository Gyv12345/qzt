import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, Form, Input, Tabs, Toast } from 'antd-mobile'
import { loginMallUser, registerMallUser } from '../../services/mall'
import { useUserStore } from '../../stores/user'

/** 登录/注册(手机号+密码)。成功后回跳来源页(location.state.from,默认商品列表) */
export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const setAuth = useUserStore((s) => s.setAuth)
  const [activeKey, setActiveKey] = useState('login')
  const [loading, setLoading] = useState(false)
  const [loginForm] = Form.useForm()
  const [regForm] = Form.useForm()

  const back = () => {
    const from = (location.state as { from?: string } | null)?.from
    navigate(from && from !== '/login' ? from : '/goods', { replace: true })
  }

  const phoneRules = [
    { required: true, message: '请填写手机号' },
    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
  ]
  const passwordRules = [
    { required: true, message: '请填写密码' },
    { min: 6, max: 32, message: '密码 6-32 位' },
  ]

  return (
    <div className="page">
      <div className="topbar">
        <a className="topbar-back" onClick={back}>
          ‹
        </a>
        <div className="topbar-title">登录行简商城</div>
        <div style={{ width: 26 }} />
      </div>

      <div style={{ padding: '18px 12px 0' }}>
        <div className="card" style={{ padding: 6 }}>
          <Tabs activeKey={activeKey} onChange={setActiveKey}>
            <Tabs.Tab title="登录" key="login">
              <Form
                layout="vertical"
                form={loginForm}
                style={{ '--border-inner-top': 'none' } as never}
                onFinish={async (values) => {
                  setLoading(true)
                  try {
                    const res = await loginMallUser({
                      phone: String(values.phone || ''),
                      password: String(values.password || ''),
                    })
                    setAuth(res.token, res.user)
                    Toast.show({ content: `欢迎回来,${res.user.nickname || res.user.phone}` })
                    back()
                  } catch {
                    // 拦截器已 Toast(密码错误等)
                  } finally {
                    setLoading(false)
                  }
                }}
                footer={
                  <Button
                    block
                    color="primary"
                    size="large"
                    loading={loading}
                    style={{
                      borderRadius: 999,
                      background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
                      border: 'none',
                      boxShadow: '0 4px 14px rgba(15,76,129,.35)',
                    }}
                    onClick={() => loginForm.submit()}
                  >
                    登录
                  </Button>
                }
              >
                <Form.Item name="phone" label="手机号" rules={phoneRules}>
                  <Input type="tel" placeholder="11 位手机号" maxLength={11} clearable />
                </Form.Item>
                <Form.Item name="password" label="密码" rules={passwordRules}>
                  <Input type="password" placeholder="登录密码" maxLength={32} />
                </Form.Item>
              </Form>
            </Tabs.Tab>

            <Tabs.Tab title="注册" key="register">
              <Form
                layout="vertical"
                form={regForm}
                style={{ '--border-inner-top': 'none' } as never}
                onFinish={async (values) => {
                  const phone = String(values.phone || '')
                  const password = String(values.password || '')
                  let registered = false
                  setLoading(true)
                  try {
                    await registerMallUser({
                      phone,
                      password,
                      nickname: values.nickname ? String(values.nickname) : undefined,
                    })
                    registered = true
                    const res = await loginMallUser({ phone, password })
                    if (!res.token || !res.user) throw new Error('Invalid login response')
                    setAuth(res.token, res.user)
                    Toast.show({ content: '注册成功,已自动登录' })
                    back()
                  } catch {
                    // 注册失败由拦截器 Toast;仅自动登录失败需要引导到登录 Tab
                    if (registered) {
                      setActiveKey('login')
                      loginForm.setFieldValue('phone', phone)
                      Toast.show({ content: '账号已创建,自动登录失败,请直接登录' })
                    }
                  } finally {
                    setLoading(false)
                  }
                }}
                footer={
                  <Button
                    block
                    color="primary"
                    size="large"
                    loading={loading}
                    style={{
                      borderRadius: 999,
                      background: 'linear-gradient(135deg, var(--brand-500), var(--brand-700))',
                      border: 'none',
                      boxShadow: '0 4px 14px rgba(15,76,129,.35)',
                    }}
                    onClick={() => regForm.submit()}
                  >
                    注册并登录
                  </Button>
                }
              >
                <Form.Item name="phone" label="手机号" rules={phoneRules}>
                  <Input type="tel" placeholder="11 位手机号" maxLength={11} clearable />
                </Form.Item>
                <Form.Item name="nickname" label="昵称(选填)">
                  <Input placeholder="给自己起个名字" maxLength={20} />
                </Form.Item>
                <Form.Item name="password" label="密码" rules={passwordRules}>
                  <Input type="password" placeholder="设置 6-32 位密码" maxLength={32} />
                </Form.Item>
              </Form>
            </Tabs.Tab>
          </Tabs>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--ink-3)', fontSize: 12, padding: '14px 24px' }}>
          登录后可领券、下单用券;不登录也可正常浏览与购买
        </div>
      </div>
    </div>
  )
}
