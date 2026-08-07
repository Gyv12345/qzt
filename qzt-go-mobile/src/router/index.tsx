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
const LeadList = lazy(() => import('../pages/lead'))
const LeadDetail = lazy(() => import('../pages/lead/detail'))
const OpportunityList = lazy(() => import('../pages/opportunity'))
const OpportunityDetail = lazy(() => import('../pages/opportunity/detail'))
const ContractList = lazy(() => import('../pages/contract'))
const ContractDetail = lazy(() => import('../pages/contract/detail'))
const ApprovalList = lazy(() => import('../pages/approval'))
const ApprovalDetail = lazy(() => import('../pages/approval/detail'))
const NewsList = lazy(() => import('../pages/news'))
const NewsDetail = lazy(() => import('../pages/news/detail'))
// OA 办公
const ExpenseList = lazy(() => import('../pages/expense'))
const ExpenseDetail = lazy(() => import('../pages/expense/detail'))
const TripList = lazy(() => import('../pages/trip'))
const TripDetail = lazy(() => import('../pages/trip/detail'))
const LoanList = lazy(() => import('../pages/loan'))
const LoanDetail = lazy(() => import('../pages/loan/detail'))
// 财务
const ReceivableList = lazy(() => import('../pages/finance/receivable'))
const ReceivableDetail = lazy(() => import('../pages/finance/receivable/detail'))
// 项目
const ProjectList = lazy(() => import('../pages/project'))
const ProjectDetail = lazy(() => import('../pages/project/detail'))
// HRM
const EmployeeList = lazy(() => import('../pages/hrm/employee'))
const EmployeeDetail = lazy(() => import('../pages/hrm/employee/detail'))
const LeaveList = lazy(() => import('../pages/hrm/leave'))
const LeaveDetail = lazy(() => import('../pages/hrm/leave/detail'))
// PSI
const PurchaseList = lazy(() => import('../pages/psi/purchase'))
const SalesList = lazy(() => import('../pages/psi/sales'))
const StockList = lazy(() => import('../pages/psi/stock'))
const AssetList = lazy(() => import('../pages/psi/asset'))
// CRM 补充
const ProductList = lazy(() => import('../pages/product'))
const TicketList = lazy(() => import('../pages/ticket'))
const TicketDetail = lazy(() => import('../pages/ticket/detail'))

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
            path: '/lead',
            element: (
              <Suspense fallback={pageFallback}>
                <LeadList />
              </Suspense>
            ),
          },
          {
            path: '/lead/:id',
            element: (
              <Suspense fallback={pageFallback}>
                <LeadDetail />
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
            path: '/expense',
            element: <Suspense fallback={pageFallback}><ExpenseList /></Suspense>,
          },
          {
            path: '/expense/:id',
            element: <Suspense fallback={pageFallback}><ExpenseDetail /></Suspense>,
          },
          {
            path: '/trip',
            element: <Suspense fallback={pageFallback}><TripList /></Suspense>,
          },
          {
            path: '/trip/:id',
            element: <Suspense fallback={pageFallback}><TripDetail /></Suspense>,
          },
          {
            path: '/loan',
            element: <Suspense fallback={pageFallback}><LoanList /></Suspense>,
          },
          {
            path: '/loan/:id',
            element: <Suspense fallback={pageFallback}><LoanDetail /></Suspense>,
          },
          {
            path: '/finance/receivable',
            element: <Suspense fallback={pageFallback}><ReceivableList /></Suspense>,
          },
          {
            path: '/finance/receivable/:id',
            element: <Suspense fallback={pageFallback}><ReceivableDetail /></Suspense>,
          },
          {
            path: '/project',
            element: <Suspense fallback={pageFallback}><ProjectList /></Suspense>,
          },
          {
            path: '/project/:id',
            element: <Suspense fallback={pageFallback}><ProjectDetail /></Suspense>,
          },
          {
            path: '/hrm/employee',
            element: <Suspense fallback={pageFallback}><EmployeeList /></Suspense>,
          },
          {
            path: '/hrm/employee/:id',
            element: <Suspense fallback={pageFallback}><EmployeeDetail /></Suspense>,
          },
          {
            path: '/hrm/leave',
            element: <Suspense fallback={pageFallback}><LeaveList /></Suspense>,
          },
          {
            path: '/hrm/leave/:id',
            element: <Suspense fallback={pageFallback}><LeaveDetail /></Suspense>,
          },
          {
            path: '/psi/purchase',
            element: <Suspense fallback={pageFallback}><PurchaseList /></Suspense>,
          },
          {
            path: '/psi/sales',
            element: <Suspense fallback={pageFallback}><SalesList /></Suspense>,
          },
          {
            path: '/psi/stock',
            element: <Suspense fallback={pageFallback}><StockList /></Suspense>,
          },
          {
            path: '/psi/asset',
            element: <Suspense fallback={pageFallback}><AssetList /></Suspense>,
          },
          {
            path: '/product',
            element: <Suspense fallback={pageFallback}><ProductList /></Suspense>,
          },
          {
            path: '/ticket',
            element: <Suspense fallback={pageFallback}><TicketList /></Suspense>,
          },
          {
            path: '/ticket/:id',
            element: <Suspense fallback={pageFallback}><TicketDetail /></Suspense>,
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
