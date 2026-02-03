import { createFileRoute } from '@tanstack/react-router'
import { Card, CardContent } from '@/components/ui/card'
import { Users, FileText, DollarSign, ShoppingBag, TrendingUp, CheckCircle } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  prefix?: React.ReactNode
  suffix?: string
  colorClass: string
}

const StatCard: React.FC<StatCardProps> = ({ title, value, prefix, suffix, colorClass }) => {
  return (
    <Card className="shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
            <p className={`text-2xl font-bold ${colorClass}`}>
              {prefix && typeof prefix === 'string' ? prefix : ''}
              {typeof value === 'number' ? value.toLocaleString() : value}
              {suffix}
            </p>
          </div>
          {prefix && typeof prefix !== 'string' && (
            <div className="ml-4">{prefix}</div>
          )}
        </div>
      </div>
    </Card>
  )
}

export const Route = createFileRoute('/_authenticated/statistics')({
  component: StatisticsPage,
})

function StatisticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">统计分析</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">查看系统各项数据统计</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="客户总数"
          value={1128}
          prefix={<Users className="w-6 h-6 text-green-600" />}
          colorClass="text-green-600 dark:text-green-400"
        />

        <StatCard
          title="合同总数"
          value={856}
          prefix={<FileText className="w-6 h-6 text-blue-600" />}
          colorClass="text-blue-600 dark:text-blue-400"
        />

        <StatCard
          title="总销售额"
          value={1234.5}
          suffix="万"
          prefix={<DollarSign className="w-6 h-6 text-purple-600" />}
          colorClass="text-purple-600 dark:text-purple-400"
        />

        <StatCard
          title="产品总数"
          value={128}
          prefix={<ShoppingBag className="w-6 h-6 text-orange-600" />}
          colorClass="text-orange-600 dark:text-orange-400"
        />
      </div>

      {/* 趋势分析 */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">月度趋势</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">本月新增客户</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">较上月增长 12%</div>
                </div>
              </div>
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">+56</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">本月签约合同</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">较上月增长 8%</div>
                </div>
              </div>
              <div className="text-lg font-semibold text-blue-600 dark:text-blue-400">+32</div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">本月销售额</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">较上月增长 15%</div>
                </div>
              </div>
              <div className="text-lg font-semibold text-purple-600 dark:text-purple-400">
                ¥156.8万
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 数据提示 */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">数据统计说明</div>
              <div className="text-xs text-blue-700 dark:text-blue-400">
                以上数据基于实时统计，每小时自动更新。您可以通过筛选器查看不同时间段的统计数据。
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
