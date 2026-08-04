import { lazy, useEffect, useMemo, useState, type ComponentType, type ReactElement } from 'react'
import { Navigate, useRoutes, type RouteObject } from 'react-router-dom'
import { Button, Result, Spin } from 'antd'
import { useAuthStore } from '../stores/auth'
import { useDictStore } from '../stores/dict'
import { useUserStore } from '../stores/users'
import { fetchUserInfo } from '../services/auth'
import type { SysMenu } from '../types'
import BasicLayout from '../layouts/BasicLayout'
import Login from '../pages/login'
import Dashboard from '../pages/dashboard'
import WecomBind from '../pages/wecom-bind'
import NotFound from '../pages/error/404'

/** pages 目录下所有页面,按后端菜单的 component 字段(如 system/user/index)解析 */
const pageModules = import.meta.glob('../pages/**/*.tsx')

function lazyPage(component: string) {
  const loader = pageModules[`../pages/${component}.tsx`]
  if (!loader) return NotFound
  return lazy(loader as () => Promise<{ default: ComponentType }>)
}

/** 将后端菜单树(type=1 且有 component)拍平为路由 */
function buildMenuRoutes(menus: SysMenu[]): RouteObject[] {
  const routes: RouteObject[] = []
  const walk = (list: SysMenu[]) => {
    for (const m of list) {
      if (m.type === 1 && m.component && m.status === 1) {
        const Page = lazyPage(m.component)
        routes.push({ path: m.path, element: <Page /> })
      }
      if (m.children?.length) walk(m.children)
    }
  }
  walk(menus)
  return routes
}

function RequireAuth({ children }: { children: ReactElement }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return children
}

export default function AppRoutes() {
  const { accessToken, userLoaded, menus } = useAuthStore()
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
      { path: '/auth/wecom/bind', element: <WecomBind /> },
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
