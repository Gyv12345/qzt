import { useQuery } from '@tanstack/react-query'
import { getScrmApi } from './api'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['statistics', 'dashboard'],
    queryFn: () => getScrmApi().statisticsControllerGetDashboardStats(),
  })
}

export function usePerformanceStats(year?: number) {
  return useQuery({
    queryKey: ['statistics', 'performance', year],
    queryFn: () =>
      getScrmApi().statisticsControllerGetPerformanceStats(
        year ? { year: String(year) } : undefined,
      ),
  })
}

export function useCustomerAnalysis() {
  return useQuery({
    queryKey: ['statistics', 'customers'],
    queryFn: () => getScrmApi().statisticsControllerGetCustomerAnalysis(),
  })
}

export function usePaymentStats(month?: string) {
  return useQuery({
    queryKey: ['statistics', 'payments', month],
    queryFn: () =>
      getScrmApi().statisticsControllerGetPaymentStats(
        month ? { month } : undefined,
      ),
  })
}

export function useInvoiceStats(month?: string) {
  return useQuery({
    queryKey: ['statistics', 'invoices', month],
    queryFn: () =>
      getScrmApi().statisticsControllerGetInvoiceStats(
        month ? { month } : undefined,
      ),
  })
}
