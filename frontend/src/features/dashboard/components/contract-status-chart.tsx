import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getScrmApi } from "@/services/api";

// 合同状态颜色
const STATUS_COLORS: Record<string, string> = {
  UNPAID: "#f59e0b", // amber - 待收款
  PARTIAL: "#3b82f6", // blue - 部分收款
  PAID: "#10b981", // green - 已收全
};

const STATUS_LABELS: Record<string, string> = {
  UNPAID: "待收款",
  PARTIAL: "部分收款",
  PAID: "已收全",
};

export function ContractStatusChart() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["contract-status-distribution"],
    queryFn: async () => {
      const api = getScrmApi();
      const response = await api.statisticsControllerGetContractStatusDistribution();
      return response;
    },
  });

  // 处理数据
  const chartData = data
    ? Array.isArray(data)
      ? (data as any[]).map((item) => ({
          name: STATUS_LABELS[item.status] || item.status,
          value: item.count || 0,
          amount: item.totalAmount || 0,
          color: STATUS_COLORS[item.status] || "#gray",
        }))
      : []
    : [];

  const totalContracts = chartData.reduce((sum, item) => sum + item.value, 0);
  const totalAmount = chartData.reduce((sum, item) => sum + item.amount, 0);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            合同状态分布
          </CardTitle>
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
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            合同状态分布
          </CardTitle>
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
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            合同状态分布
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            总合同数: {totalContracts} | 总金额: ¥{totalAmount.toLocaleString()}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            暂无数据
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string, props: any) => [
                  `${value} 个合同 (¥${props.payload.amount.toLocaleString()})`,
                  props.payload.name,
                ]}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
