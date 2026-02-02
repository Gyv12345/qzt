import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { LoginPage } from '@/pages/LoginPage'
import { CustomerListPage } from '@/pages/customer/CustomerListPage'
import { CustomerDetailPage } from '@/pages/customer/CustomerDetailPage'
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
        index: true,
        element: <Navigate to="/customers" replace />,
      },
      {
        path: 'customers',
        element: <MainLayout />,
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
    ],
  },
])
