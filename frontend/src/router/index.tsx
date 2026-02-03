import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { LoginPage } from '@/pages/LoginPage'
import { CustomerListPage, CustomerDetailPage } from '@/pages/customer'
import { ContactListPage, ContactDetailPage } from '@/pages/contact'
import { ProductListPage, ProductDetailPage } from '@/pages/product'
import { ContractListPage, ContractDetailPage } from '@/pages/contract'
import { InvoiceListPage } from '@/pages/invoice'
import { FollowRecordListPage } from '@/pages/follow-record'
import { DashboardPage } from '@/pages/DashboardPage'
import { StatisticsPage } from '@/pages/statistics'
import { SystemPage } from '@/pages/system'
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
            path: 'contacts',
            children: [
              {
                index: true,
                element: <ContactListPage />,
              },
              {
                path: ':id',
                element: <ContactDetailPage />,
              },
            ],
          },
          {
            path: 'contracts',
            children: [
              {
                index: true,
                element: <ContractListPage />,
              },
              {
                path: ':id',
                element: <ContractDetailPage />,
              },
            ],
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
            path: 'invoices',
            element: <InvoiceListPage />,
          },
          {
            path: 'follow-records',
            element: <FollowRecordListPage />,
          },
          {
            path: 'statistics',
            element: <StatisticsPage />,
          },
          {
            path: 'system',
            element: <SystemPage />,
          },
        ],
      },
    ],
  },
])
