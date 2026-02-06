import { useQuery } from "@tanstack/react-query";
import { getScrmApi } from "@/services/api";

// 客户等级分布
export function useCustomerLevelDistribution() {
  return useQuery({
    queryKey: ["customer-statistics", "level-distribution"],
    queryFn: async () => {
      const { customerControllerGetLevelDistribution } = getScrmApi();
      return (await customerControllerGetLevelDistribution()) as any;
    },
    refetchOnWindowFocus: false,
  });
}

// 客户转化率
export function useCustomerConversionRate(months: number = 6) {
  return useQuery({
    queryKey: ["customer-statistics", "conversion-rate", months],
    queryFn: async () => {
      const { customerControllerGetConversionRate } = getScrmApi();
      return (await customerControllerGetConversionRate({ months })) as any;
    },
    refetchOnWindowFocus: false,
  });
}

// 客户增长趋势
export function useCustomerGrowthTrend(months: number = 6) {
  return useQuery({
    queryKey: ["customer-statistics", "growth-trend", months],
    queryFn: async () => {
      const { customerControllerGetGrowthTrend } = getScrmApi();
      return (await customerControllerGetGrowthTrend({ months })) as any;
    },
    refetchOnWindowFocus: false,
  });
}

// 综合统计数据
export function useCustomerStatistics() {
  const levelDistribution = useCustomerLevelDistribution();
  const conversionRate = useCustomerConversionRate();
  const growthTrend = useCustomerGrowthTrend();

  return {
    levelDistribution: levelDistribution.data,
    conversionRate: conversionRate.data,
    growthTrend: growthTrend.data,
    isLoading:
      levelDistribution.isLoading ||
      conversionRate.isLoading ||
      growthTrend.isLoading,
    error: levelDistribution.error || conversionRate.error || growthTrend.error,
  };
}
