import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { LoginPage } from '@/pages/LoginPage'
import { CustomerListPage } from '@/pages/customer/CustomerListPage'
import { CustomerDetailPage } from '@/pages/customer/CustomerDetailPage'
import { ProductListPage, ProductDetailPage } from '@/pages/product'
import { ContractListPage } from '@/pages/contract'
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
                element: <CustomerListPage />,
              },
              {
                path: ':id',
                element: <CustomerDetailPage />,
              },
            ],
          },
          {
            path: 'contracts',
            element: <ContractListPage />,
          },
          {
            path: 'products',
            children: [
              {
                index: true,
                element: <ProductListPage />,
              },
              {
                path: ':id',
                element: <ProductDetailPage />,
              },
            ],
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
