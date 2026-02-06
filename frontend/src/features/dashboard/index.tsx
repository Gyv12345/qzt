import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";
import { LanguageSwitch } from "@/components/language-switch";
import { ConfigDrawer } from "@/components/config-drawer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Overview } from "./components/overview";
import { StatsCards } from "./components/stats-cards";
import { CustomerGrowthChart } from "./components/customer-growth-chart";
import { useDashboardStats } from "./hooks/use-dashboard-stats";

export function Dashboard() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: stats, isLoading, error, refetch } = useDashboardStats();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <>
      <Header>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-medium">工作台</h1>
        </div>
        <div className="ms-auto flex items-center space-x-4">
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
          <Search />
          <ThemeSwitch />
          <LanguageSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
        {/* 统计卡片 */}
        <StatsCards data={stats} isLoading={isLoading} />

        {/* 图表区域 */}
        <div className="grid gap-4 md:grid-cols-2">
          <CustomerGrowthChart />

          {/* 数据概览 */}
          <Card>
            <CardHeader>
              <CardTitle>数据概览</CardTitle>
            </CardHeader>
            <CardContent className="ps-2">
              <Overview />
            </CardContent>
          </Card>
        </div>

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
    </>
  );
}
