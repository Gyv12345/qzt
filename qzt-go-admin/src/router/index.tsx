import { lazy, useEffect, useMemo, useState, type ReactElement } from 'react'
import { Navigate, useRoutes, type RouteObject } from 'react-router-dom'
import { Button, Result, Spin } from 'antd'
import { useAuthStore } from '../stores/auth'
import { useDictStore } from '../stores/dict'
import { useUserStore } from '../stores/users'
import { fetchUserInfo } from '../services/auth'
import type { SysMenu } from '../types'
import BasicLayout from '../layouts/BasicLayout'
import Login from '../pages/login'
import OauthCallback from '../pages/oauth/callback'
import ShareReceive from '../pages/share'
import Profile from '../pages/profile'
import WecomBind from '../pages/wecom-bind'
import NotFound from '../pages/error/404'
import { Dashboard, extraRoutes, getPage } from './pages'

/**
 * 后端第三方扫码登录回调 302 到 `/#/oauth/callback?token=...`(hash 形式)。
 * 本应用是 BrowserRouter,不感知 hash,模块加载期把 hash 形式归一为
 * 路径路由 `/oauth/callback?token=...`,再交给下方公开路由处理。
 */
if (typeof window !== 'undefined' && window.location.hash.startsWith('#/oauth/callback')) {
  const raw = window.location.hash.slice(1)
  const qi = raw.indexOf('?')
  window.history.replaceState(null, '', '/oauth/callback' + (qi >= 0 ? raw.slice(qi) : ''))
}

// 大屏单独 lazy(间接引入 echarts,与 Dashboard 同理移出首屏 bundle)
const BigScreen = lazy(() => import('../pages/bigscreen'))

/** 将后端菜单树(type=1 且有 component)拍平为路由 */
function buildMenuRoutes(menus: SysMenu[]): RouteObject[] {
  const routes: RouteObject[] = []
  const walk = (list: SysMenu[]) => {
    for (const m of list) {
      if (m.type === 1 && m.component && m.status === 1) {
        const Page = getPage(m.component)
        routes.push({ path: m.path, element: <Page /> })
      }
      if (m.children?.length) walk(m.children)
    }
  }
  walk(menus)
  return routes
}

function buildExtraRoutes(): RouteObject[] {
  return extraRoutes.map((r) => {
    const Page = getPage(r.component)
    return { path: r.path, element: <Page /> }
  })
}

function RequireAuth({ children }: { children: ReactElement }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return children
}

export default function AppRoutes() {
  const accessToken = useAuthStore((s) => s.accessToken)
  const userLoaded = useAuthStore((s) => s.userLoaded)
  const menus = useAuthStore((s) => s.menus)
  const [loadError, setLoadError] = useState(false)

  // 刷新页面/深链接时,先加载用户信息(含菜单)再计算动态路由,避免误落 404
  const needUserInfo = !!accessToken && !userLoaded
  useEffect(() => {
    if (needUserInfo) {
      setLoadError(false)
      Promise.all([
        fetchUserInfo(),
        // 字典/用户缓存失败不阻塞主流程
        useDictStore.getState().load().catch(() => {}),
        useUserStore.getState().load().catch(() => {}),
      ]).catch(() => {
        // 401 由拦截器跳转登录页;其他错误给出重试入口
        setLoadError(true)
      })
    }
  }, [needUserInfo])

  const routes = useMemo<RouteObject[]>(
    () => [
      { path: '/login', element: <Login /> },
      // 第三方扫码登录回调(钉钉/飞书,公开路由,RequireAuth 外)
      { path: '/oauth/callback', element: <OauthCallback /> },
      // 经营数据大屏:登录后可用,但不套 BasicLayout(独立 chrome-less 全屏页,与 /login 同级注册)
      {
        path: '/bigscreen',
        element: (
          <RequireAuth>
            <BigScreen />
          </RequireAuth>
        ),
      },
      // 免登录公开领取页(与 /login 同级,不经过 RequireAuth)
      { path: '/share/:token', element: <ShareReceive /> },
      { path: '/auth/wecom/bind', element: <WecomBind /> },
      { path: '/profile', element: <RequireAuth><Profile /></RequireAuth> },
      {
        path: '/',
        element: (
          <RequireAuth>
            <BasicLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: <Dashboard /> },
          ...buildMenuRoutes(menus),
          ...buildExtraRoutes(),
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
    [menus],
  )

  const element = useRoutes(routes)

  if (needUserInfo) {
    if (loadError) {
      return (
        <Result
          status="error"
          title="用户信息加载失败"
          subTitle="请检查网络或后端服务后重试"
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          }
        />
      )
    }
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size="large" />
      </div>
    )
  }
  return element
}
