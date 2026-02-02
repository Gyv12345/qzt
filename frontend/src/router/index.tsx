import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { LoginPage } from '@/pages/LoginPage'
import { CustomerList } from '@/pages/customer/CustomerList'
import { CustomerDetail } from '@/pages/customer/CustomerDetail'
import { ProductList } from '@/pages/product/ProductList'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'dashboard',
            element: <DashboardPage />,
          },
          {
            path: 'customers',
            children: [
              {
                index: true,
                element: <CustomerList />,
              },
              {
                path: ':id',
                element: <CustomerDetail />,
              },
            ],
          },
          {
            path: 'contracts',
            element: <div>合同管理页面开发中...</div>,
          },
          {
            path: 'products',
            element: <ProductList />,
          },
          {
            path: 'system',
            element: <div>系统管理页面开发中...</div>,
          },
        ],
      },
    ],
  },
])
