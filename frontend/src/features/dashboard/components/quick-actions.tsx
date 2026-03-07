import { Link } from "@tanstack/react-router";
import {
  Plus,
  Users,
  FileText,
  DollarSign,
  Package,
  Bell,
  Settings,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const quickActions = [
  {
    title: "新增客户",
    icon: Users,
    href: "/customers/new",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/20",
  },
  {
    title: "创建合同",
    icon: FileText,
    href: "/contracts/new",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/20",
  },
  {
    title: "记录收款",
    icon: DollarSign,
    href: "/payments/new",
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/20",
  },
  {
    title: "添加产品",
    icon: Package,
    href: "/products/new",
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/20",
  },
  {
    title: "系统设置",
    icon: Settings,
    href: "/settings",
    color: "text-gray-600",
    bgColor: "bg-gray-50 dark:bg-gray-950/20",
  },
  {
    title: "帮助中心",
    icon: HelpCircle,
    href: "/help-center",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 dark:bg-cyan-950/20",
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          快速操作
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} to={action.href}>
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex-col gap-2 hover:shadow-md transition-shadow"
                >
                  <div
                    className={`h-10 w-10 rounded-lg ${action.bgColor} flex items-center justify-center`}
                  >
                    <Icon className={`h-5 w-5 ${action.color}`} />
                  </div>
                  <span className="text-sm font-medium">{action.title}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
