import { useQuery } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'

// Dashboard 统计数据
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const { statisticsControllerGetDashboardStats } = getScrmApi()
      const response = await statisticsControllerGetDashboardStats()
      return response.data as any
    },
  })
}

// 客户增长趋势
export function useCustomerGrowthTrend(params?: { days?: number }) {
  return useQuery({
    queryKey: ['customer-growth', params],
    queryFn: async () => {
      const { statisticsControllerGetCustomerGrowthTrend } = getScrmApi()
      const response = await statisticsControllerGetCustomerGrowthTrend(params)
      return response.data as any
    },
  })
}

// 销售业绩
export function useSalesPerformance(params?: { startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['sales-performance', params],
    queryFn: async () => {
      const { statisticsControllerGetSalesPerformance } = getScrmApi()
      const response = await statisticsControllerGetSalesPerformance(params)
      return response.data as any
    },
  })
}
