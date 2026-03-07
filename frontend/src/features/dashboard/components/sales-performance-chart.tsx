import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Users } from "lucide-react";
import { useSalesPerformance } from "../hooks/use-dashboard-stats";

// 颜色数组
const COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#84cc16", // lime
];

interface SalesPerformanceChartProps {
  startDate?: string;
  endDate?: string;
}

export function SalesPerformanceChart({
  startDate,
  endDate,
}: SalesPerformanceChartProps) {
  const { data, isLoading, error } = useSalesPerformance({
    startDate,
    endDate,
  });

  // 处理数据，只取前10名
  const chartData = data
    ? Array.isArray(data)
      ? (data as any[]).slice(0, 10).map((item, index) => ({
          name: item.userName || `销售${index + 1}`,
          正式客户: item.formalCustomers || 0,
          VIP客户: item.vipCustomers || 0,
          意向客户: item.intentionCustomers || 0,
          线索客户: item.potentialCustomers || 0,
          总客户数: item.totalCustomers || 0,
          转化率: item.conversionRate || 0,
        }))
      : []
    : [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            销售业绩排行
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            销售业绩排行
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            加载失败
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            销售业绩排行 (TOP 10)
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            按正式客户数量排序
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[400px] text-muted-foreground">
            暂无数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={80}
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
              <Bar
                dataKey="VIP客户"
                stackId="a"
                fill="#8b5cf6"
                name="VIP客户"
              />
              <Bar
                dataKey="正式客户"
                stackId="a"
                fill="#10b981"
                name="正式客户"
              />
              <Bar
                dataKey="意向客户"
                stackId="a"
                fill="#f59e0b"
                name="意向客户"
              />
              <Bar
                dataKey="线索客户"
                stackId="a"
                fill="#3b82f6"
                name="线索客户"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
