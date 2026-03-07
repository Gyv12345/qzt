import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Overview } from "./components/overview";
import { StatsCards } from "./components/stats-cards";
import { CustomerGrowthChart } from "./components/customer-growth-chart";
import { SalesPerformanceChart } from "./components/sales-performance-chart";
import { ProductSalesChart } from "./components/product-sales-chart";
import { ContractStatusChart } from "./components/contract-status-chart";
import { QuickActions } from "./components/quick-actions";
import { useDashboardStats } from "./hooks/use-dashboard-stats";

export function Dashboard() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: stats, isLoading, refetch } = useDashboardStats();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      {/* 页面头部：标题 + 刷新按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">工作台</h2>
          <p className="text-muted-foreground">数据概览与统计</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isRefreshing || isLoading}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
          />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <StatsCards data={stats} isLoading={isLoading} />

      {/* 快速操作 */}
      <QuickActions />

      {/* 图表区域 - 第一行 */}
      <div className="grid gap-4 md:grid-cols-2">
        <CustomerGrowthChart />
        <ContractStatusChart />
      </div>

      {/* 图表区域 - 第二行 */}
      <div className="grid gap-4 md:grid-cols-2">
        <SalesPerformanceChart />
        <ProductSalesChart />
      </div>

      {/* 数据概览 */}
      <Card>
        <CardHeader>
          <CardTitle>数据概览</CardTitle>
        </CardHeader>
        <CardContent className="ps-2">
          <Overview />
        </CardContent>
      </Card>

      {/* 最近活动 */}
      {stats?.recentActivities && stats.recentActivities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>最近活动</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.recentActivities
                .slice(0, 5)
                .map((activity: any, index: number) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div className="text-sm">
                      {activity.description || "活动记录"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {activity.time || new Date().toLocaleDateString()}
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </Main>
  );
}
