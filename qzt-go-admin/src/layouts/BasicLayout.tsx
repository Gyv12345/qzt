import { useEffect, useMemo, useState, Suspense } from 'react'
import { Avatar, Button, Descriptions, Divider, Dropdown, Modal, Result, Spin, Tooltip, theme as antdTheme, Watermark } from 'antd'
import {
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
  AppstoreOutlined,
  DownOutlined,
  InfoCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
} from '@ant-design/icons'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'
import { fetchUserInfo, logout } from '../services/auth'
import { getSiteConfig, getVersion } from '../services/system'
import type { SysMenu, SysSiteConfig, SystemVersionInfo } from '../types'
import MenuIcon from '../components/MenuIcon'
import ErrorBoundary from '../components/ErrorBoundary'
import MessageBox from '../components/layout/MessageBox'
import NotificationHandler from '../components/layout/NotificationHandler'
import LayoutSettings from '../components/layout/LayoutSettings'
import TabBar from '../components/layout/TabBar'
import HelpGuide from '../components/layout/HelpGuide'
import NotFound from '../pages/error/404'
import { buildPageMap } from '../router/pages'
import { useSettingsStore } from '../stores/settings'
import { useTabsStore } from '../stores/tabs'
import { findChain, visibleMenus } from '../utils/menu'

import './basic-layout.css'

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

/** 站点信息子集:顶栏 logo/名称 + 「关于系统」联系方式 */
type SiteCfgLite = Pick<
  SysSiteConfig,
  'site_name' | 'logo_url' | 'contact_phone' | 'contact_email' | 'contact_address' | 'work_hours'
>

/** 模块级缓存:布局重复挂载(登录跳转等)时避免闪烁 */
let siteCfgCache: SiteCfgLite | null = null

export default function BasicLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const userLoaded = useAuthStore((s) => s.userLoaded)
  const menus = useAuthStore((s) => s.menus)
  const profile = useAuthStore((s) => s.profile)
  // 水印文案:昵称(用户名),同全局用户下拉展示格式;profile 未加载时不渲染水印
  const wmText = profile ? `${profile.nickname || profile.username}(${profile.username})` : ''
  /** 多 Tab 模式:Tab 列表/挂载记录/刷新计数(keep-alive 渲染用) */
  const multiTab = useSettingsStore((s) => s.multiTab)
  /** 内容全屏:隐藏顶栏/侧栏/Tab 栏,只留内容区(Esc 退出) */
  const contentFullscreen = useSettingsStore((s) => s.contentFullscreen)
  const toggleContentFullscreen = useSettingsStore((s) => s.toggleContentFullscreen)
  /** 页面水印开关:内容区平铺当前登录用户,防截屏外传溯源 */
  const watermark = useSettingsStore((s) => s.watermark)
  // 水印字色随明暗模式切换(深色下黑字不可见)
  const isDark = useSettingsStore((s) => (s.themeMode === 'auto' ? s.systemDark : s.themeMode === 'dark'))
  const tabs = useTabsStore((s) => s.tabs)
  const tabMounted = useTabsStore((s) => s.mounted)
  const refreshSeq = useTabsStore((s) => s.refreshSeq)
  const openTab = useTabsStore((s) => s.open)
  /** antd 设计令牌:联系方式图标跟随主题色 */
  const { token } = antdTheme.useToken()
  const [loading, setLoading] = useState(!userLoaded)
  const [error, setError] = useState(false)
  /** 左侧第二列展开的分组 id(用户点击分组但未跳转时也需要展开) */
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null)
  /** 站点信息:顶栏 logo/名称取自「系统设置-站点信息」,未配置时回退默认样式 */
  const [siteCfg, setSiteCfg] = useState<SiteCfgLite | null>(siteCfgCache)
  /** 「关于系统」弹窗:每次打开重新拉取版本信息 */
  const [aboutOpen, setAboutOpen] = useState(false)
  const [verInfo, setVerInfo] = useState<SystemVersionInfo | null>(null)
  const [verErr, setVerErr] = useState(false)

  useEffect(() => {
    if (siteCfgCache) return
    getSiteConfig()
      .then((cfg) => {
        siteCfgCache = {
          site_name: cfg.site_name,
          logo_url: cfg.logo_url,
          contact_phone: cfg.contact_phone,
          contact_email: cfg.contact_email,
          contact_address: cfg.contact_address,
          work_hours: cfg.work_hours,
        }
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

  /** Tab 面板的 path → 页面组件映射(组件走全局 lazy 缓存,实例稳定保证 keep-alive) */
  const pageMap = useMemo(() => buildPageMap(menus), [menus])

  // 进入新页面时打开对应 Tab('/' 由 index 路由重定向到 /dashboard,不作为 Tab)
  useEffect(() => {
    if (multiTab && location.pathname !== '/') openTab(location.pathname)
  }, [multiTab, location.pathname, openTab])

  /** 首页(个人主页)路径:不展示左侧菜单 */
  const isHome = location.pathname === '/' || location.pathname === '/dashboard'

  /** 当前激活模块:优先取路径命中,否则取第一个业务模块 */
  const activeModule = chain?.module ?? businessModules[0] ?? systemModule ?? null

  // 路由变化时,让第二列展开的分组跟随当前页面
  useEffect(() => {
    if (chain?.group) setExpandedGroupId(chain.group.id)
  }, [chain])

  // 内容全屏时按 Esc 退出
  useEffect(() => {
    if (!contentFullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleContentFullscreen()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [contentFullscreen, toggleContentFullscreen])

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

  /** 打开「关于系统」弹窗并加载版本信息 */
  const openAbout = () => {
    setAboutOpen(true)
    setVerInfo(null)
    setVerErr(false)
    getVersion()
      .then(setVerInfo)
      .catch(() => setVerErr(true))
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

  /** 页面级 Suspense 兜底(多 Tab 面板与单页模式共用) */
  const pageLoading = (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 120 }}>
      <Spin size="large" />
    </div>
  )

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
    <div className={`qzt-layout${contentFullscreen ? ' is-fullscreen' : ''}`}>
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

        {/* 面包屑:当前页面的模块→分组→页面 导航链(可逐级点击);首页与全屏态不显示 */}
        {!isHome && !contentFullscreen && (
          <nav className="qzt-breadcrumb" aria-label="面包屑">
            {chain?.module && (
              <>
                <button className="qzt-bc-item" onClick={() => onPrimaryClick(chain.module!)}>
                  {chain.module.name}
                </button>
                {chain.group && (
                  <>
                    <span className="qzt-bc-sep">/</span>
                    <button className="qzt-bc-item" onClick={() => setExpandedGroupId(chain.group!.id)}>
                      {chain.group.name}
                    </button>
                  </>
                )}
                {chain.leaf && (
                  <>
                    <span className="qzt-bc-sep">/</span>
                    <span className="qzt-bc-item current">{chain.leaf.name}</span>
                  </>
                )}
              </>
            )}
          </nav>
        )}

        <div className="qzt-header-right">
          <Tooltip title={contentFullscreen ? '退出内容全屏(Esc)' : '内容全屏'}>
            <button
              className="qzt-header-icon-btn"
              type="button"
              aria-label={contentFullscreen ? '退出内容全屏' : '内容全屏'}
              onClick={toggleContentFullscreen}
            >
              {contentFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
            </button>
          </Tooltip>
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
                { key: 'about', icon: <InfoCircleOutlined />, label: '关于系统' },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', danger: true },
              ],
              onClick: async ({ key }) => {
                if (key === 'profile') {
                  navigate('/profile')
                } else if (key === 'settings' && systemModule) {
                  goModule(systemModule)
                } else if (key === 'about') {
                  openAbout()
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

        {/* 页面水印:接管 .qzt-content 原本的 flex 位置(包装层 flex:1),内容=当前登录用户 */}
        <Watermark
          className="qzt-watermark"
          content={watermark && wmText ? wmText : ''}
          style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}
          font={{ fontSize: 14, color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.045)' }}
          gap={[140, 140]}
          zIndex={9}
        >
        <main className={`qzt-content${multiTab ? ' with-tabs' : ''}`}>
          {/* '/' 仍走 Outlet:让 index 路由的 <Navigate to="/dashboard"> 完成重定向后再进多 Tab 渲染 */}
          {multiTab && location.pathname !== '/' ? (
            <>
              <TabBar />
              {/* open 生效前的一帧把当前页临时并入渲染,避免新 Tab 首帧空白 */}
              {(tabs.includes(location.pathname) || location.pathname === '/'
                ? tabs
                : [...tabs, location.pathname]
              ).map((path) => {
                // 持久化恢复但本会话未访问过的 Tab 先不挂载,首次激活时再挂载,
                // 避免刷新页面时所有恢复的 Tab 同时发起数据请求
                if (!tabMounted.includes(path) && path !== location.pathname) return null
                const Page = pageMap.get(path)
                return (
                  <div
                    key={`${path}#${refreshSeq[path] ?? 0}`}
                    className="qzt-tabpane"
                    style={{ display: path === location.pathname ? undefined : 'none' }}
                  >
                    <ErrorBoundary>
                      <Suspense fallback={pageLoading}>
                        {/* 菜单下线等导致映射缺失时兜底 404 */}
                        {Page ? <Page /> : <NotFound />}
                      </Suspense>
                    </ErrorBoundary>
                  </div>
                )
              })}
            </>
          ) : (
            <ErrorBoundary>
              <Suspense fallback={pageLoading}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          )}
        </main>
        </Watermark>
      </div>

      {/* 关于系统:展示后端构建版本信息(来自免鉴权接口 /system/version) */}
      <Modal
        title="关于系统"
        open={aboutOpen}
        footer={null}
        width={440}
        onCancel={() => setAboutOpen(false)}
      >
        {verErr ? (
          <Result status="warning" title="版本信息加载失败" style={{ padding: '24px 0' }} />
        ) : verInfo ? (
          <Descriptions column={1} size="small" bordered>
            <Descriptions.Item label="系统版本">{verInfo.version}</Descriptions.Item>
            <Descriptions.Item label="Git 提交">{verInfo.git_commit}</Descriptions.Item>
            <Descriptions.Item label="构建时间">{verInfo.build_time}</Descriptions.Item>
            <Descriptions.Item label="Go 版本">{verInfo.go_version}</Descriptions.Item>
          </Descriptions>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
            <Spin />
          </div>
        )}

        {/* 联系方式:取自「系统设置-站点信息」,字段全部为空时整段隐藏(适配私有化部署) */}
        {siteCfg && (siteCfg.contact_phone || siteCfg.contact_email || siteCfg.contact_address || siteCfg.work_hours) && (
          <>
            <Divider plain style={{ margin: '16px 0 12px' }}>
              联系我们
            </Divider>
            <div className="about-contact">
              {siteCfg.contact_phone && (
                <div className="about-contact-item">
                  <PhoneOutlined style={{ color: token.colorPrimary }} />
                  <span className="k">电话</span>
                  <span>{siteCfg.contact_phone}</span>
                </div>
              )}
              {siteCfg.contact_email && (
                <div className="about-contact-item">
                  <MailOutlined style={{ color: token.colorPrimary }} />
                  <span className="k">邮箱</span>
                  <span>{siteCfg.contact_email}</span>
                </div>
              )}
              {siteCfg.contact_address && (
                <div className="about-contact-item">
                  <EnvironmentOutlined style={{ color: token.colorPrimary }} />
                  <span className="k">地址</span>
                  <span>{siteCfg.contact_address}</span>
                </div>
              )}
              {siteCfg.work_hours && (
                <div className="about-contact-item">
                  <ClockCircleOutlined style={{ color: token.colorPrimary }} />
                  <span className="k">服务时间</span>
                  <span>{siteCfg.work_hours}</span>
                </div>
              )}
            </div>
          </>
        )}
      </Modal>

      <NotificationHandler />
    </div>
  )
}
