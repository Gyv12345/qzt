import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Contract } from '@/types'

interface ContractCardProps {
  contract: Contract
}

export function ContractCard({ contract }: ContractCardProps) {
  // 合同状态映射
  const statusMap = {
    0: { text: '待收款', color: 'destructive' as const },
    1: { text: '部分收款', color: 'default' as const },
    2: { text: '已收全', color: 'default' as const },
  }

  const status = statusMap[contract.status] || statusMap[0]

  // 收款进度
  const progress = contract.amount > 0 ? (contract.paidAmount / contract.amount) * 100 : 0

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="font-mono text-xs text-muted-foreground mb-1">
            {contract.contractNo}
          </div>
          <h3 className="font-semibold text-lg">{contract.customer?.name || '未知客户'}</h3>
        </div>
        <Badge variant={status.color}>{status.text}</Badge>
      </div>

      <div className="space-y-2 text-sm mb-3">
        <div className="flex justify-between">
          <span className="text-muted-foreground">产品:</span>
          <span>{contract.product?.name || '-'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">合同金额:</span>
          <span className="font-semibold">¥{contract.amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">已收金额:</span>
          <span className="text-green-600">¥{contract.paidAmount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">服务周期:</span>
          <span className="text-xs">
            {new Date(contract.serviceStart).toLocaleDateString()} ~ {new Date(contract.serviceEnd).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* 收款进度条 */}
      <div className="border-t pt-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>收款进度</span>
          <span>{progress.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>
    </Card>
  )
}
