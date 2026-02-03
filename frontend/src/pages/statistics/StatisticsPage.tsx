import React from "react";
import { Card } from "@/components/ui/card";
import { Users, FileText, DollarSign, ShoppingBag, TrendingUp, CheckCircle } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  prefix?: React.ReactNode;
  suffix?: string;
  colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, prefix, suffix, colorClass }) => {
  return (
    <Card className="shadow-sm">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <p className={`text-2xl font-bold ${colorClass}`}>
              {prefix}
              {typeof value === 'number' ? value.toLocaleString() : value}
              {suffix}
            </p>
          </div>
          {prefix && typeof prefix !== 'string' && (
            <div className="ml-4">
              {prefix}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export const StatisticsPage: React.FC = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">统计分析</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="客户总数"
          value={1128}
          prefix={<Users className="w-6 h-6 text-green-600" />}
          colorClass="text-green-600"
        />

        <StatCard
          title="合同总数"
          value={93}
          suffix="份"
          prefix={<FileText className="w-6 h-6 text-blue-600" />}
          colorClass="text-blue-600"
        />

        <StatCard
          title="合同金额"
          value={1128000}
          prefix="¥"
          colorClass="text-red-600"
        />

        <StatCard
          title="收款金额"
          value={856000}
          prefix="¥"
          colorClass="text-green-600"
        />

        <StatCard
          title="待收款"
          value={272000}
          prefix="¥"
          colorClass="text-yellow-600"
        />

        <StatCard
          title="产品总数"
          value={45}
          suffix="个"
          prefix={<ShoppingBag className="w-6 h-6 text-purple-600" />}
          colorClass="text-purple-600"
        />

        <StatCard
          title="本月新增客户"
          value={28}
          prefix={<TrendingUp className="w-6 h-6 text-blue-600" />}
          colorClass="text-blue-600"
        />

        <StatCard
          title="已完成跟进"
          value={156}
          suffix="次"
          prefix={<CheckCircle className="w-6 h-6 text-green-600" />}
          colorClass="text-green-600"
        />
      </div>
    </div>
  );
};
