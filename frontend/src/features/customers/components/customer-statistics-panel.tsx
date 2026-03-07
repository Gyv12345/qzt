import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useCustomerStatistics } from "../hooks/use-customer-statistics";
import { Users, TrendingUp, Activity } from "lucide-react";

const LEVEL_COLORS = {
  LEAD: "#94a3b8",
  PROSPECT: "#3b82f6",
  CUSTOMER: "#10b981",
  VIP: "#f59e0b",
};

const LEVEL_LABELS: Record<string, string> = {
  LEAD: "线索",
  PROSPECT: "意向",
  CUSTOMER: "正式",
  VIP: "VIP",
};

export function CustomerStatisticsPanel() {
  const { levelDistribution, conversionRate, growthTrend, isLoading } =
    useCustomerStatistics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // 准备等级分布数据
  const levelData = levelDistribution?.distribution || [];
  const pieData = levelData.map((d: any) => ({
    name: LEVEL_LABELS[d.level] || d.level,
    value: d.count,
    percentage: d.percentage,
  }));

  // 准备增长趋势数据
  const trendData = growthTrend?.data || [];
  const growthChartData = trendData.map((d: any) => ({
    month: d.month.slice(5), // MM
    新增: d.new,
    累计: d.cumulative,
  }));

  // 准备转化率数据
  const conversionData = conversionRate?.data || [];
  const conversionChartData = conversionData.map((d: any) => ({
    month: d.month.slice(5),
    转化率: d.conversionRate,
  }));

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* 客户等级分布 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            客户等级分布
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {levelDistribution?.total || 0}
          </div>
          <div className="text-xs text-muted-foreground mb-4">总客户数</div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={60}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((_entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      LEVEL_COLORS[
                        Object.keys(LEVEL_LABELS)[
                          index
                        ] as keyof typeof LEVEL_COLORS
                      ]
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                // @ts-expect-error - Recharts Tooltip formatter 类型定义不匹配
                formatter={(value: number, name: string) => {
                  const item = pieData.find((d: any) => d.name === name);
                  return [
                    `${value} (${item?.percentage.toFixed(1) || 0}%)`,
                    name,
                  ];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {levelData.map((d: any) => (
              <div key={d.level} className="flex items-center gap-1 text-xs">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor:
                      LEVEL_COLORS[d.level as keyof typeof LEVEL_COLORS],
                  }}
                />
                <span>
                  {LEVEL_LABELS[d.level]}: {d.count}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 客户增长趋势 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            客户增长趋势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            +{growthTrend?.summary?.newInPeriod || 0}
          </div>
          <div className="text-xs text-muted-foreground mb-4">
            近6个月新增客户
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={growthChartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10 }}
                stroke="#6b7280"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="#6b7280"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Line
                type="monotone"
                dataKey="新增"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="text-xs text-muted-foreground mt-2">
            累计客户: {growthTrend?.summary?.total || 0}
          </div>
        </CardContent>
      </Card>

      {/* 客户转化率 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            客户转化率
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-2">
            {conversionRate?.summary?.averageConversionRate?.toFixed(1) || 0}%
          </div>
          <div className="text-xs text-muted-foreground mb-4">平均转化率</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={conversionChartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e5e7eb"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 10 }}
                stroke="#6b7280"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="#6b7280"
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                // @ts-expect-error - Recharts Tooltip formatter 类型定义不匹配
                formatter={(value: number) => [`${value}%`, "转化率"] as any}
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
              />
              <Bar dataKey="转化率" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="text-xs text-muted-foreground mt-2">
            基于近6个月数据
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
