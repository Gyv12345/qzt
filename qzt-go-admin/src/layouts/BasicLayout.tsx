import { useEffect, useMemo, useState, Suspense } from 'react'
import { Avatar, Button, Dropdown, Result, Spin } from 'antd'
import { LogoutOutlined, SettingOutlined, UserOutlined, AppstoreOutlined, DownOutlined } from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { fetchUserInfo, logout } from '../services/auth'
import { getSiteConfig } from '../services/system'
import type { SysSiteConfig } from '../types'
import MenuIcon from '../components/MenuIcon'
import ErrorBoundary from '../components/ErrorBoundary'
import MessageBox from '../components/layout/MessageBox'
import NotificationHandler from '../components/layout/NotificationHandler'
import LayoutSettings from '../components/layout/LayoutSettings'
import HelpGuide from '../components/layout/HelpGuide'

import type { SysMenu } from '../types'
import './basic-layout.css'

/** 过滤出可见菜单(排除按钮),并按 sort 排序 */
function visibleMenus(list: SysMenu[] = []): SysMenu[] {
  return list
    .filter((m) => m.type !== 2 && m.visible === 1 && m.status === 1)
    .sort((a, b) => a.sort - b.sort)
}

/** 菜单树中第一个可跳转的叶子路径 */
function firstLeafPath(menu: SysMenu): string | null {
  if (menu.type === 1 && menu.path) return menu.path
  for (const child of visibleMenus(menu.children)) {
    const p = firstLeafPath(child)
    if (p) return p
  }
  return null
}

/** 判断是否为「后台设置」模块(路径以 /system 开头) */
function isSystemModule(menu: SysMenu): boolean {
  if (menu.path?.startsWith('/system')) return true
  return (menu.children ?? []).some(isSystemModule)
}

/** 站点信息(logo/站点名称)模块级缓存:布局重复挂载(登录跳转等)时避免闪烁 */
let siteCfgCache: Pick<SysSiteConfig, 'site_name' | 'logo_url'> | null = null

interface MenuChain {
  module: SysMenu
  /** 叶子所属的分组(二级目录),无分组时为 null */
  group: SysMenu | null
  leaf: SysMenu
}

/** 根据当前路径定位 模块/分组/叶子 三级链 */
function findChain(modules: SysMenu[], pathname: string): MenuChain | null {
  const match = (path?: string) =>
    !!path && (pathname === path || pathname.startsWith(`${path}/`))
  for (const module of modules) {
    if (module.type === 1) {
      if (match(module.path)) return { module, group: null, leaf: module }
      continue
    }
    for (const child of visibleMenus(module.children)) {
      if (child.type === 1) {
        if (match(child.path)) return { module, group: null, leaf: child }
        continue
      }
      for (const leaf of visibleMenus(child.children)) {
        if (leaf.type === 1 && match(leaf.path)) return { module, group: child, leaf }
      }
    }
  }
  return null
}

export default function BasicLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const userLoaded = useAuthStore((s) => s.userLoaded)
  const menus = useAuthStore((s) => s.menus)
  const profile = useAuthStore((s) => s.profile)
  const [loading, setLoading] = useState(!userLoaded)
  const [error, setError] = useState(false)
  /** 左侧第二列展开的分组 id(用户点击分组但未跳转时也需要展开) */
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null)
  /** 站点信息:顶栏 logo/名称取自「系统设置-站点信息」,未配置时回退默认样式 */
  const [siteCfg, setSiteCfg] = useState<Pick<SysSiteConfig, 'site_name' | 'logo_url'> | null>(siteCfgCache)

  useEffect(() => {
    if (siteCfgCache) return
    getSiteConfig()
      .then((cfg) => {
        siteCfgCache = { site_name: cfg.site_name, logo_url: cfg.logo_url }
        setSiteCfg(siteCfgCache)
      })
      .catch(() => {})
  }, [])

  const load = () => {
    setLoading(true)
    setError(false)
    fetchUserInfo()
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!userLoaded) load()
  }, [userLoaded])

  /** 一级菜单 = 模块,拆分为业务模块与后台设置 */
  const { businessModules, systemModule } = useMemo(() => {
    const top = visibleMenus(menus)
    const system = top.find(isSystemModule) ?? null
    return {
      businessModules: top.filter((m) => m !== system),
      systemModule: system,
    }
  }, [menus])

  const allModules = useMemo(
    () => (systemModule ? [...businessModules, systemModule] : businessModules),
    [businessModules, systemModule],
  )

  /** 当前路径命中的菜单链 */
  const chain = useMemo(() => findChain(allModules, location.pathname), [allModules, location.pathname])

  /** 首页(个人主页)路径:不展示左侧菜单 */
  const isHome = location.pathname === '/' || location.pathname === '/dashboard'

  /** 当前激活模块:优先取路径命中,否则取第一个业务模块 */
  const activeModule = chain?.module ?? businessModules[0] ?? systemModule ?? null

  // 路由变化时,让第二列展开的分组跟随当前页面
  useEffect(() => {
    if (chain?.group) setExpandedGroupId(chain.group.id)
  }, [chain])

  /** 当前模块下的二级菜单(分组或直接页面) */
  const moduleChildren = useMemo(
    () => (activeModule && activeModule.type !== 1 ? visibleMenus(activeModule.children) : []),
    [activeModule],
  )

  const groups = moduleChildren.filter((c) => c.type === 0 && visibleMenus(c.children).length > 0)
  const hasGroups = groups.length > 0

  /** 当前命中直接页面(非分组下叶子),如 PSI 报表:此状态下不展示第二列 */
  const isDirectLeaf = !!chain && chain.group === null

  /** 第二列展示的分组:当前命中 > 用户已展开 > 第一个分组 */
  const secondaryGroup = isDirectLeaf
    ? null
    : (chain?.group ?? null) ??
      groups.find((g) => g.id === expandedGroupId) ??
      groups[0] ??
      null
  const secondaryLeaves = secondaryGroup ? visibleMenus(secondaryGroup.children) : []

  const goModule = (module: SysMenu) => {
    const path = firstLeafPath(module)
    if (path) navigate(path)
  }

  const onPrimaryClick = (item: SysMenu) => {
    if (item.type === 1 && item.path) {
      navigate(item.path)
    } else {
      // 点击分组:展开第二列,同时跳到该分组第一个页面
      setExpandedGroupId(item.id)
      const path = firstLeafPath(item)
      if (path) navigate(path)
    }
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="加载用户信息...">
          <div style={{ width: 200, height: 60 }} />
        </Spin>
      </div>
    )
  }

  if (error) {
    return (
      <Result
        status="error"
        title="用户信息加载失败"
        subTitle="请检查网络后重试"
        extra={
          <Button type="primary" onClick={load}>
            重新加载
          </Button>
        }
      />
    )
  }

  return (
    <div className="qzt-layout">
      <header className="qzt-header">
        <div
          className="qzt-logo"
          onClick={() => navigate('/dashboard')}
          style={{ cursor: 'pointer' }}
        >
          {siteCfg?.logo_url ? (
            <img src={siteCfg.logo_url} alt={siteCfg?.site_name || 'logo'} className="qzt-logo-img" />
          ) : (
            <div className="qzt-logo-mark">Q</div>
          )}
          <div className="qzt-logo-title">{siteCfg?.site_name || '业务管理平台'}</div>
        </div>

        <div className="qzt-module-nav" data-guide="global:module-nav">
          <Dropdown
            overlayClassName="qzt-module-dropdown"
            menu={{
              items: businessModules.map((m) => ({
                key: String(m.id),
                label: m.name,
                icon: <MenuIcon icon={m.icon} />,
              })),
              selectable: true,
              selectedKeys: activeModule ? [String(activeModule.id)] : [],
              onClick: ({ key }) => {
                const m = businessModules.find((x) => String(x.id) === key)
                if (m) goModule(m)
              },
            }}
          >
            <button className="qzt-module-trigger" type="button">
              <AppstoreOutlined />
              <span>{activeModule?.name ?? '选择模块'}</span>
              <DownOutlined style={{ fontSize: 10 }} />
            </button>
          </Dropdown>
        </div>

        <div className="qzt-header-right">
          <MessageBox />
          <LayoutSettings />
          <HelpGuide />
          <Dropdown
            menu={{
              items: [
                { key: 'profile', icon: <UserOutlined />, label: '个人中心' },
                ...(systemModule
                  ? [
                      { type: 'divider' as const },
                      { key: 'settings', icon: <SettingOutlined />, label: '后台设置' },
                      { type: 'divider' as const },
                    ]
                  : [{ type: 'divider' as const }]),
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
              ],
              onClick: async ({ key }) => {
                if (key === 'profile') {
                  navigate('/profile')
                } else if (key === 'settings' && systemModule) {
                  goModule(systemModule)
                } else if (key === 'logout') {
                  await logout()
                  navigate('/login', { replace: true })
                }
              },
            }}
          >
            <span className="qzt-user">
              <Avatar size="small" src={profile?.avatar || undefined} icon={<UserOutlined />} />
              <span>{profile?.nickname || profile?.username}</span>
            </span>
          </Dropdown>
        </div>
      </header>

      <div className="qzt-body">
        {/* 首页(个人中心)不展示左侧菜单 */}
        {!isHome && moduleChildren.length > 0 && (
          <>
            {/* 第一列:分组 / 页面 */}
            <aside className={`qzt-side-primary${hasGroups ? '' : ' wide'}`} data-guide="global:side-primary">
              {moduleChildren.map((item) => {
                const isActive =
                  item.type === 1
                    ? chain?.leaf === item
                    : secondaryGroup === item
                return (
                  <button
                    key={item.id}
                    className={`qzt-side-item${isActive ? ' active' : ''}`}
                    onClick={() => onPrimaryClick(item)}
                  >
                    <MenuIcon icon={item.icon} />
                    <span>{item.name}</span>
                  </button>
                )
              })}
            </aside>

            {/* 第二列:分组下的页面 */}
            {hasGroups && secondaryGroup && (
              <aside className="qzt-side-secondary" key={secondaryGroup.id}>
                <div className="qzt-side-group-title">{secondaryGroup.name}</div>
                {secondaryLeaves.map((leaf) => (
                  <button
                    key={leaf.id}
                    className={`qzt-side-leaf${chain?.leaf === leaf ? ' active' : ''}`}
                    onClick={() => leaf.path && navigate(leaf.path)}
                  >
                    {leaf.name}
                  </button>
                ))}
              </aside>
            )}
          </>
        )}

        <main className="qzt-content">
          <ErrorBoundary>
            <Suspense
              fallback={
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
                  <Spin size="large" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <NotificationHandler />
    </div>
  )
}
