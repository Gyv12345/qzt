import { useEffect, useState } from 'react'
import { Dialog, Form, Input, Popup, Button, Toast } from 'antd-mobile'
import {
  CloseOutline,
  GlobalOutline,
  RightOutline,
  SetOutline,
  SoundOutline,
  UnorderedListOutline,
  UserOutline,
} from 'antd-mobile-icons'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout, updateProfile, changePassword } from '../../services/auth'
import { useAuthStore } from '../../stores/auth'
import { useThemeStore, type ThemeMode } from '../../stores/theme'
import { getDashboardOverview } from '../../services/dashboard'
import type { DashboardOverview } from '../../types/dashboard'
import './mine.css'

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'auto', label: '系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

const APP_VERSION = 'v1.0.0'

interface MenuItem {
  icon: ReactNode
  iconBg: string
  label: string
  extra?: string
  arrow?: boolean
  onClick?: () => void
}

/** 底部弹窗统一头部 */
function PopupHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="mine-popup-header">
      <span className="mine-popup-title">{title}</span>
      <button className="mine-popup-close" onClick={onClose}>
        <CloseOutline />
      </button>
    </div>
  )
}

export default function Mine() {
  const profile = useAuthStore((s) => s.profile)
  const updateProfileStore = useAuthStore((s) => s.updateProfile)
  const navigate = useNavigate()
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  const [overview, setOverview] = useState<DashboardOverview | null>(null)

  const [showProfile, setShowProfile] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showAbout, setShowAbout] = useState(false)

  useEffect(() => {
    getDashboardOverview().then(setOverview).catch(() => {})
  }, [])

  const onLogout = async () => {
    const confirmed = await Dialog.confirm({ content: '确定要退出登录吗?' })
    if (!confirmed) return
    await logout()
    Toast.show({ icon: 'success', content: '已退出登录' })
    navigate('/login', { replace: true })
  }

  const ov = overview
  const stats = ov
    ? [
        { num: ov.customer_total, label: '客户' },
        { num: ov.opportunity_total, label: '商机' },
        { num: ov.contract_total, label: '合同' },
      ]
    : []

  const accountMenus: MenuItem[] = [
    { icon: <UserOutline />, iconBg: 'var(--icon-bg-crm)', label: '个人资料', arrow: true, onClick: () => setShowProfile(true) },
    { icon: <UnorderedListOutline />, iconBg: 'var(--icon-bg-approval)', label: '修改密码', arrow: true, onClick: () => setShowPassword(true) },
  ]

  const generalMenus: MenuItem[] = [
    { icon: <SoundOutline />, iconBg: 'var(--icon-bg-notice)', label: '消息通知', arrow: true, onClick: () => Toast.show({ content: '功能开发中' }) },
    {
      icon: <SetOutline />, iconBg: 'var(--icon-bg-settings)', label: '清除缓存',
      onClick: () => { localStorage.removeItem('qzt-mobile:cached'); Toast.show({ icon: 'success', content: '缓存已清除' }) },
    },
  ]

  const aboutMenus: MenuItem[] = [
    { icon: <GlobalOutline />, iconBg: 'var(--icon-bg-news)', label: '关于企智通', extra: APP_VERSION, arrow: true, onClick: () => setShowAbout(true) },
  ]

  const renderMenu = (item: MenuItem, i: number) => (
    <div className="mine-menu-item" key={i} onClick={item.onClick}>
      <span className="mine-menu-icon" style={{ background: item.iconBg, color: 'var(--brand)' }}>{item.icon}</span>
      <span className="mine-menu-label">{item.label}</span>
      {item.extra && <span className="mine-menu-extra">{item.extra}</span>}
      {item.arrow && <RightOutline className="mine-arrow" />}
    </div>
  )

  const initial = profile?.nickname?.[0] || profile?.username?.[0] || 'U'

  return (
    <div className="mine-page">
      {/* 头部资料卡 */}
      <div className="mine-header">
        <div className="mine-profile">
          <div className="mine-avatar">
            {profile?.avatar ? (
              <img src={profile.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mine-name">{profile?.nickname || '用户'}</div>
            <div className="mine-username">@{profile?.username}</div>
            {profile?.roles && profile.roles.length > 0 && (
              <div className="mine-roles">
                {profile.roles.map((r) => (<span className="mine-role-tag" key={r.id}>{r.name}</span>))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 数据条 */}
      {stats.length > 0 && (
        <div className="mine-stats-bar">
          {stats.map((s) => (
            <div className="mine-stats-item" key={s.label}>
              <div className="mine-stats-num">{s.num}</div>
              <div className="mine-stats-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* 外观 */}
      <div className="mine-group">
        <div className="mine-group-title">外观</div>
        <div className="mine-menu-item">
          <span className="mine-menu-icon" style={{ background: 'var(--icon-bg-settings)', color: 'var(--brand)' }}><SetOutline /></span>
          <span className="mine-menu-label">深色模式</span>
          <div className="mine-theme-options">
            {THEME_OPTIONS.map((opt) => (
              <button key={opt.value} className={`mine-theme-chip${mode === opt.value ? ' active' : ''}`} onClick={() => setMode(opt.value)}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 账户管理 */}
      <div className="mine-group">
        <div className="mine-group-title">账户管理</div>
        {accountMenus.map(renderMenu)}
      </div>

      {/* 通用 */}
      <div className="mine-group">
        <div className="mine-group-title">通用</div>
        {generalMenus.map(renderMenu)}
      </div>

      {/* 关于 */}
      <div className="mine-group">
        <div className="mine-group-title">关于</div>
        {aboutMenus.map(renderMenu)}
      </div>

      {/* 退出 */}
      <button className="mine-logout" onClick={onLogout}>退出登录</button>

      {/* ── 弹窗 ── */}
      <ProfilePopup visible={showProfile} onClose={() => setShowProfile(false)} profile={profile} onSaved={(patch) => updateProfileStore(patch)} />
      <PasswordPopup visible={showPassword} onClose={() => setShowPassword(false)} />
      <Popup visible={showAbout} onMaskClick={() => setShowAbout(false)} bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }} position="bottom">
        <div style={{ padding: '32px 28px 40px', textAlign: 'center' }}>
          <div style={{ width: 76, height: 76, borderRadius: 20, background: 'var(--brand-gradient)', color: '#fff', fontSize: 38, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(47, 84, 235, 0.25)' }}>企</div>
          <div style={{ fontSize: 19, fontWeight: 700 }}>企智通</div>
          <div style={{ fontSize: 14, color: 'var(--text-tertiary)', marginTop: 6 }}>企业级业务管理平台 {APP_VERSION}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 }}>
            {['CRM', 'OA办公', '进销存', '财务', '人事', '审批', '知识库', '网盘'].map((t) => (
              <span key={t} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 12, background: 'var(--bg)', color: 'var(--text-secondary)' }}>{t}</span>
            ))}
          </div>
          <Button block color="primary" size="large" style={{ marginTop: 28, borderRadius: 12 }} onClick={() => setShowAbout(false)}>知道了</Button>
        </div>
      </Popup>
    </div>
  )
}

// ── 个人资料弹窗 ──
function ProfilePopup({ visible, onClose, profile, onSaved }: {
  visible: boolean; onClose: () => void
  profile: { nickname?: string; email?: string; phone?: string } | null
  onSaved: (patch: { nickname?: string; email?: string; phone?: string }) => void
}) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const handleFinish = async (values: { nickname: string; email: string; phone: string }) => {
    setSubmitting(true)
    try {
      await updateProfile(values)
      onSaved(values)
      Toast.show({ icon: 'success', content: '资料已更新' })
      onClose()
    } catch { /* request 拦截器 Toast */ } finally { setSubmitting(false) }
  }

  return (
    <Popup visible={visible} onMaskClick={onClose} bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85vh', overflowY: 'auto' }} position="bottom" destroyOnClose>
      <div style={{ padding: '0 20px 28px' }}>
        <PopupHeader title="个人资料" onClose={onClose} />
        <Form
          form={form} layout="horizontal" onFinish={handleFinish}
          initialValues={{ nickname: profile?.nickname || '', email: profile?.email || '', phone: profile?.phone || '' }}
          footer={<Button block color="primary" size="large" loading={submitting} onClick={() => form.submit()} style={{ borderRadius: 12, marginTop: 8 }}>保存</Button>}
        >
          <Form.Item name="nickname" label="昵称"><Input placeholder="请输入昵称" /></Form.Item>
          <Form.Item name="email" label="邮箱"><Input placeholder="请输入邮箱" type="email" /></Form.Item>
          <Form.Item name="phone" label="手机号"><Input placeholder="请输入手机号" type="tel" /></Form.Item>
        </Form>
      </div>
    </Popup>
  )
}

// ── 修改密码弹窗 ──
function PasswordPopup({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const handleFinish = async (values: { old_password: string; new_password: string; confirm: string }) => {
    if (values.new_password !== values.confirm) { Toast.show({ icon: 'fail', content: '两次输入的新密码不一致' }); return }
    if (values.new_password.length < 6) { Toast.show({ icon: 'fail', content: '新密码至少6位' }); return }
    setSubmitting(true)
    try {
      await changePassword({ old_password: values.old_password, new_password: values.new_password })
      Toast.show({ icon: 'success', content: '密码修改成功' })
      form.resetFields(); onClose()
    } catch { /* request 拦截器 Toast */ } finally { setSubmitting(false) }
  }

  return (
    <Popup visible={visible} onMaskClick={onClose} bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85vh', overflowY: 'auto' }} position="bottom" destroyOnClose>
      <div style={{ padding: '0 20px 28px' }}>
        <PopupHeader title="修改密码" onClose={onClose} />
        <Form
          form={form} layout="horizontal" onFinish={handleFinish}
          footer={<Button block color="primary" size="large" loading={submitting} onClick={() => form.submit()} style={{ borderRadius: 12, marginTop: 8 }}>确认修改</Button>}
        >
          <Form.Item name="old_password" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
            <Input placeholder="请输入当前密码" type="password" />
          </Form.Item>
          <Form.Item name="new_password" label="新密码" rules={[{ required: true, message: '请输入新密码' }]}>
            <Input placeholder="6-72位" type="password" />
          </Form.Item>
          <Form.Item name="confirm" label="确认密码" rules={[{ required: true, message: '请再次输入新密码' }]}>
            <Input placeholder="请再次输入新密码" type="password" />
          </Form.Item>
        </Form>
      </div>
    </Popup>
  )
}
