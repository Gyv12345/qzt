import { Card } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'
import { getScrmApi } from '@/services'
import { AlertTriangle, TrendingUp, FileText, DollarSign } from 'lucide-react'

interface InvoiceStatsCardProps {
  customerId?: string
  month?: string
}

export function InvoiceStatsCard({ customerId, month }: InvoiceStatsCardProps) {
  // 获取客户开票汇总
  const { data: summary, isLoading } = useQuery({
    queryKey: ['invoice-summary', customerId, month],
    queryFn: async () => {
      if (!customerId) return null
      const api = getScrmApi()
      return await api.invoiceControllerGetCustomerSummary(customerId, { month })
    },
    enabled: !!customerId,
  })

  if (!customerId) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          请选择客户查看统计数据
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="text-center">加载统计数据中...</div>
      </Card>
    )
  }

  if (!summary) {
    return null
  }

  const stats = [
    {
      title: '本月开票金额',
      value: `¥${(summary.totalAmount || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: '本月开票张数',
      value: `${summary.totalCount || 0}张`,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '超额张数',
      value: `+${summary.overLimitCount || 0}张`,
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      show: summary.overLimitCount > 0,
    },
    {
      title: '超额金额',
      value: `¥${(summary.overLimitAmount || 0).toLocaleString()}`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      show: summary.overLimitAmount > 0,
    },
    {
      title: '产品额度',
      value: `${summary.invoiceLimit || 0}/月`,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: '包含张数',
      value: `${summary.invoiceCount || 0}张/月`,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ]

  const visibleStats = stats.filter((s) => s.show !== false)

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {visibleStats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.title} className="p-4">
            <div className={`${stat.bgColor} rounded-full p-2 w-fit mb-2`}>
              <Icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div className="text-sm text-muted-foreground">{stat.title}</div>
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
