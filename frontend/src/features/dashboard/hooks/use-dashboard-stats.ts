import { useQuery } from "@tanstack/react-query";
import { getScrmApi } from "@/services/api";

// Dashboard 统计数据
export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { statisticsControllerGetDashboardStats } = getScrmApi();
      // API 拦截器已自动提取 response.data，直接返回即可
      return await statisticsControllerGetDashboardStats();
    },
  });
}

// 客户增长趋势
export function useCustomerGrowthTrend(params?: { days?: number }) {
  return useQuery<any>({
    queryKey: ["customer-growth", params],
    queryFn: async () => {
      const { statisticsControllerGetCustomerGrowthTrend } = getScrmApi();
      // API 拦截器已自动提取 response.data
      return await statisticsControllerGetCustomerGrowthTrend(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        params as any,
      );
    },
  });
}

// 销售业绩
export function useSalesPerformance(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ["sales-performance", params],
    queryFn: async () => {
      const { statisticsControllerGetSalesPerformance } = getScrmApi();
      // API 拦截器已自动提取 response.data
      return await statisticsControllerGetSalesPerformance(params);
    },
  });
}

// 产品销售统计
export function useProductSalesStats(params?: {
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ["product-sales", params],
    queryFn: async () => {
      const { statisticsControllerGetProductSalesStats } = getScrmApi();
      // API 拦截器已自动提取 response.data
      return await statisticsControllerGetProductSalesStats(params);
    },
  });
}
