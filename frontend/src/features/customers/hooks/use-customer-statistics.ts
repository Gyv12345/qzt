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
      // @ts-expect-error - 后端 API 缺少 @ApiQuery 装饰器，Orval 未正确生成查询参数类型
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
      // @ts-expect-error - 后端 API 缺少 @ApiQuery 装饰器，Orval 未正确生成查询参数类型
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
