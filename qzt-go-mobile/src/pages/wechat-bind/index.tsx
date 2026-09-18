import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dialog, SpinLoading, Tag, Toast } from 'antd-mobile'
import { getWechatBindStatus, getWechatBindURL, wechatUnbind } from '../../services/auth'

/** 是否在微信内置浏览器内(MicroMessenger 且非企业微信 wxwork) */
export function isInWeChatBrowser(): boolean {
  const ua = navigator.userAgent
  return /MicroMessenger/i.test(ua) && !/wxwork/i.test(ua)
}

/**
 * 微信通知绑定页:绑定后审批/待办等通知经服务号模板消息推送到微信。
 * 绑定动作需在微信内置浏览器内完成(OAuth 静默授权),外部浏览器提示引导。
 */
export default function WechatBind() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [bound, setBound] = useState(false)
  const [openid, setOpenid] = useState('')
  const [jumping, setJumping] = useState(false)
  const inWeChat = isInWeChatBrowser()

  useEffect(() => {
    getWechatBindStatus()
      .then((s) => {
        setBound(s.bound)
        setOpenid(s.openid)
      })
      .catch(() => Toast.show({ content: '加载绑定状态失败' }))
      .finally(() => setLoading(false))
  }, [])

  const onBind = async () => {
    if (!inWeChat) {
      Dialog.alert({
        confirmText: '知道了',
        content: '请在微信中打开本页面完成绑定(微信内进入系统 → 我的 → 消息通知)',
      })
      return
    }
    setJumping(true)
    try {
      const { url } = await getWechatBindURL()
      window.location.href = url
    } catch (err) {
      Dialog.alert({
        confirmText: '知道了',
        content: err instanceof Error ? err.message : '获取绑定链接失败',
      })
      setJumping(false)
    }
  }

  const onUnbind = () => {
    Dialog.confirm({
      title: '解绑微信',
      content: '解绑后通知将不再推送到微信,确定解绑?',
      onConfirm: async () => {
        try {
          await wechatUnbind()
          setBound(false)
          setOpenid('')
          Toast.show({ icon: 'success', content: '已解绑' })
        } catch (e) {
          Toast.show({ content: e instanceof Error ? e.message : '解绑失败' })
        }
      },
    })
  }

  if (loading) {
    return (
      <div style={{ paddingTop: '40vh', textAlign: 'center' }}>
        <SpinLoading style={{ '--size': '36px' }} />
      </div>
    )
  }

  return (
    <div style={{ padding: '16px' }}>
      <div
        style={{
          background: '#fff',
          borderRadius: 12,
          padding: '20px 16px',
          marginBottom: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 600 }}>微信通知</span>
          {bound ? <Tag color="success">已绑定</Tag> : <Tag color="default">未绑定</Tag>}
        </div>
        <p style={{ color: '#999', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
          绑定后,审批待办、库存预警、回款提醒等通知将通过微信公众号推送到你的微信,
          点击可直接进入系统处理(免登录)。绑定后也可以在微信中一键登录移动端。
        </p>
        {bound && openid && (
          <p style={{ color: '#bbb', fontSize: 12, marginTop: 8 }}>
            openid: {openid.slice(0, 8)}…
          </p>
        )}
      </div>

      {bound ? (
        <Button block color="danger" fill="outline" onClick={onUnbind}>
          解绑微信
        </Button>
      ) : (
        <Button block color="primary" onClick={onBind} loading={jumping}>
          绑定微信
        </Button>
      )}

      {!inWeChat && !bound && (
        <p style={{ color: '#ff8f1f', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
          当前不在微信内,请用微信打开本页后再绑定
        </p>
      )}

      <Button
        block
        fill="none"
        style={{ marginTop: 12, color: '#999' }}
        onClick={() => navigate(-1)}
      >
        返回
      </Button>
    </div>
  )
}
