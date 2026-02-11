import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp } from "lucide-react";
import { useCustomerGrowthTrend } from "../hooks/use-dashboard-stats";

// 客户增长数据项类型
interface GrowthDataItem {
  date: string;
  count: number;
}

// 图表数据类型
interface ChartDataItem {
  date: string;
  count: number;
}

export function CustomerGrowthChart() {
  const { data, isLoading, error } = useCustomerGrowthTrend({ days: 30 });

  // 处理数据格式
  const chartData: ChartDataItem[] = data
    ? Array.isArray(data)
      ? (data as any).map((item: GrowthDataItem) => ({
          date: new Date(item.date).toLocaleDateString("zh-CN", {
            month: "short",
            day: "numeric",
          }),
          count: item.count || 0,
        }))
      : []
    : [];

  const totalCount = chartData.reduce(
    (sum: number, item: ChartDataItem) => sum + item.count,
    0,
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>客户增长趋势 (近30天)</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>客户增长趋势 (近30天)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            加载失败
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            客户增长趋势 (近30天)
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            累计新增:{" "}
            <span className="font-semibold text-blue-600">{totalCount}</span>{" "}
            位客户
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            暂无数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                name="新增客户"
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
