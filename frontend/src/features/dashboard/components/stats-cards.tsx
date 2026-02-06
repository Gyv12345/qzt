import {
  DollarSign,
  Users,
  ShoppingCart,
  TrendingUp,
  FileText,
  Package,
  Calendar,
  Bell,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardStatsDto } from "@/models";

interface StatsCardsProps {
  data: DashboardStatsDto | undefined;
  isLoading: boolean;
}

export function StatsCards({ data, isLoading }: StatsCardsProps) {
  const overview = data?.overview || {
    totalCustomers: 0,
    totalContracts: 0,
    totalProducts: 0,
    totalInvoices: 0,
  };
  const monthly = data?.monthly || {
    newCustomers: 0,
    newContracts: 0,
    contractAmount: 0,
    invoiceAmount: 0,
  };
  const unreadNotifications = data?.unreadNotifications || 0;

  const cards = [
    {
      title: "总收入",
      value: `¥${monthly.contractAmount?.toLocaleString() || "0"}`,
      subtitle: "本月合同金额",
      icon: DollarSign,
      color: "text-green-600",
    },
    {
      title: "客户数",
      value: overview.totalCustomers?.toLocaleString() || "0",
      subtitle: `总客户 / 本月新增 ${monthly.newCustomers || 0}`,
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "订单数",
      value: overview.totalContracts?.toLocaleString() || "0",
      subtitle: `总合同 / 本月新增 ${monthly.newContracts || 0}`,
      icon: ShoppingCart,
      color: "text-purple-600",
    },
    {
      title: "开票金额",
      value: `¥${monthly.invoiceAmount?.toLocaleString() || "0"}`,
      subtitle: "本月开票",
      icon: FileText,
      color: "text-orange-600",
    },
    {
      title: "产品数",
      value: overview.totalProducts?.toLocaleString() || "0",
      subtitle: "产品总数",
      icon: Package,
      color: "text-cyan-600",
    },
    {
      title: "开票记录",
      value: overview.totalInvoices?.toLocaleString() || "0",
      subtitle: "开票记录总数",
      icon: Calendar,
      color: "text-pink-600",
    },
    {
      title: "增长率",
      value: `${monthly.newCustomers || 0}`,
      subtitle: "本月新增客户",
      icon: TrendingUp,
      color: "text-indigo-600",
    },
    {
      title: "未读通知",
      value: unreadNotifications?.toLocaleString() || "0",
      subtitle: "待处理通知",
      icon: Bell,
      color: unreadNotifications > 0 ? "text-red-600" : "text-gray-600",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
