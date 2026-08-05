import { lazy, Suspense, useEffect, useMemo, useState, type ReactElement } from 'react'
import { Navigate, useRoutes, type RouteObject } from 'react-router-dom'
import { Button, ErrorBlock, SpinLoading } from 'antd-mobile'
import { useAuthStore } from '../stores/auth'
import { fetchUserInfo } from '../services/auth'
import TabBarLayout from '../layouts/TabBarLayout'
import Login from '../pages/login'
import Home from '../pages/home'
import Mine from '../pages/mine'
import Messages from '../pages/messages'
import NotFound from '../pages/error/404'

// 业务详情页懒加载(减少首屏体积)
const CustomerList = lazy(() => import('../pages/customer'))
const CustomerDetail = lazy(() => import('../pages/customer/detail'))
const OpportunityList = lazy(() => import('../pages/opportunity'))
const OpportunityDetail = lazy(() => import('../pages/opportunity/detail'))
const ContractList = lazy(() => import('../pages/contract'))
const ContractDetail = lazy(() => import('../pages/contract/detail'))
const ApprovalList = lazy(() => import('../pages/approval'))
const ApprovalDetail = lazy(() => import('../pages/approval/detail'))
const NewsList = lazy(() => import('../pages/news'))
const NewsDetail = lazy(() => import('../pages/news/detail'))

const pageFallback = (
  <div style={{ height: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <SpinLoading style={{ '--size': '36px' }} />
  </div>
)

function RequireAuth({ children }: { children: ReactElement }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  if (!accessToken) return <Navigate to="/login" replace />
  return children
}

export default function AppRoutes() {
  const { accessToken, userLoaded } = useAuthStore()
  const [loadError, setLoadError] = useState(false)

  // 刷新页面/深链接时,先加载用户信息再进入业务页面
  const needUserInfo = !!accessToken && !userLoaded
  useEffect(() => {
    if (needUserInfo) {
      setLoadError(false)
      fetchUserInfo().catch(() => {
        // 401 由拦截器跳转登录页;其他错误给出重试入口
        setLoadError(true)
      })
    }
  }, [needUserInfo])

  const routes = useMemo<RouteObject[]>(
    () => [
      { path: '/login', element: <Login /> },
      {
        path: '/',
        element: (
          <RequireAuth>
            <TabBarLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <Navigate to="/home" replace /> },
          { path: '/home', element: <Home /> },
          { path: '/messages', element: <Messages /> },
          { path: '/mine', element: <Mine /> },
          // 非 TabBar 子路由(仍受 RequireAuth 保护,套 TabBarLayout)
          {
            path: '/customer',
            element: (
              <Suspense fallback={pageFallback}>
                <CustomerList />
              </Suspense>
            ),
          },
          {
            path: '/customer/:id',
            element: (
              <Suspense fallback={pageFallback}>
                <CustomerDetail />
              </Suspense>
            ),
          },
          {
            path: '/opportunity',
            element: (
              <Suspense fallback={pageFallback}>
                <OpportunityList />
              </Suspense>
            ),
          },
          {
            path: '/opportunity/:id',
            element: (
              <Suspense fallback={pageFallback}>
                <OpportunityDetail />
              </Suspense>
            ),
          },
          {
            path: '/contract',
            element: (
              <Suspense fallback={pageFallback}>
                <ContractList />
              </Suspense>
            ),
          },
          {
            path: '/contract/:id',
            element: (
              <Suspense fallback={pageFallback}>
                <ContractDetail />
              </Suspense>
            ),
          },
          {
            path: '/approval',
            element: (
              <Suspense fallback={pageFallback}>
                <ApprovalList />
              </Suspense>
            ),
          },
          {
            path: '/approval/:id',
            element: (
              <Suspense fallback={pageFallback}>
                <ApprovalDetail />
              </Suspense>
            ),
          },
          {
            path: '/news',
            element: (
              <Suspense fallback={pageFallback}>
                <NewsList />
              </Suspense>
            ),
          },
          {
            path: '/news/:id',
            element: (
              <Suspense fallback={pageFallback}>
                <NewsDetail />
              </Suspense>
            ),
          },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
    [],
  )

  const element = useRoutes(routes)

  if (needUserInfo) {
    if (loadError) {
      return (
        <div style={{ paddingTop: '30vh' }}>
          <ErrorBlock
            status="default"
            title="用户信息加载失败"
            description="请检查网络或后端服务后重试"
          />
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <Button color="primary" onClick={() => window.location.reload()}>
              重新加载
            </Button>
          </div>
        </div>
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
        <SpinLoading style={{ '--size': '48px' }} />
      </div>
    )
  }
  return element
}
