import { useEffect, useState } from 'react'
import { Dialog, Toast } from 'antd-mobile'
import {
  GlobalOutline,
  RightOutline,
  SetOutline,
  SoundOutline,
  UnorderedListOutline,
  UserOutline,
} from 'antd-mobile-icons'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { logout } from '../../services/auth'
import { useAuthStore } from '../../stores/auth'
import { useThemeStore, type ThemeMode } from '../../stores/theme'
import { getDashboardOverview } from '../../services/dashboard'
import type { DashboardOverview } from '../../types/dashboard'
import './mine.css'

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'auto', label: '跟随系统' },
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
]

interface MenuItem {
  icon: ReactNode
  iconBg: string
  label: string
  extra?: string
  arrow?: boolean
  onClick?: () => void
}

export default function Mine() {
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const mode = useThemeStore((s) => s.mode)
  const setMode = useThemeStore((s) => s.setMode)
  const [overview, setOverview] = useState<DashboardOverview | null>(null)

  useEffect(() => {
    getDashboardOverview()
      .then(setOverview)
      .catch(() => {})
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
    {
      icon: <UserOutline />,
      iconBg: 'var(--icon-bg-crm)',
      label: '个人资料',
      arrow: true,
      onClick: () => Toast.show({ content: '请在电脑端管理后台修改' }),
    },
    {
      icon: <UnorderedListOutline />,
      iconBg: 'var(--icon-bg-approval)',
      label: '修改密码',
      arrow: true,
      onClick: () => Toast.show({ content: '请在电脑端管理后台修改' }),
    },
  ]

  const generalMenus: MenuItem[] = [
    {
      icon: <SoundOutline />,
      iconBg: 'var(--icon-bg-notice)',
      label: '消息通知',
      arrow: true,
      onClick: () => Toast.show({ content: '功能开发中' }),
    },
    {
      icon: <SetOutline />,
      iconBg: 'var(--icon-bg-settings)',
      label: '清除缓存',
      onClick: () => {
        localStorage.removeItem('qzt-mobile:cached')
        Toast.show({ icon: 'success', content: '缓存已清除' })
      },
    },
  ]

  const aboutMenus: MenuItem[] = [
    {
      icon: <GlobalOutline />,
      iconBg: 'var(--icon-bg-news)',
      label: '关于企智通',
      extra: 'v1.0.0',
      arrow: true,
      onClick: () => Toast.show({ content: '企智通 · 企业级业务管理平台 v1.0.0' }),
    },
  ]

  const renderMenu = (item: MenuItem, i: number) => (
    <div className="mine-menu-item" key={i} onClick={item.onClick}>
      <span className="mine-menu-icon" style={{ background: item.iconBg, color: 'var(--brand)' }}>
        {item.icon}
      </span>
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
              <img
                src={profile.avatar}
                alt=""
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              initial
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="mine-name">{profile?.nickname || '用户'}</div>
            <div className="mine-username">@{profile?.username}</div>
            {profile?.roles && profile.roles.length > 0 && (
              <div className="mine-roles">
                {profile.roles.map((r) => (
                  <span className="mine-role-tag" key={r.id}>
                    {r.name}
                  </span>
                ))}
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

      {/* 深色模式设置(独立卡片) */}
      <div className="mine-group">
        <div className="mine-group-title">外观</div>
        <div className="mine-menu-item">
          <span className="mine-menu-icon" style={{ background: 'var(--icon-bg-settings)', color: 'var(--brand)' }}>
            <SetOutline />
          </span>
          <span className="mine-menu-label">深色模式</span>
          <div className="mine-theme-options">
            {THEME_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`mine-theme-chip${mode === opt.value ? ' active' : ''}`}
                onClick={() => setMode(opt.value)}
              >
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

      {/* 退出登录 */}
      <button className="mine-logout" onClick={onLogout}>
        退出登录
      </button>
    </div>
  )
}
