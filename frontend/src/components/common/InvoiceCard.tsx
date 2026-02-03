import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface InvoiceCardProps {
  invoice: any
}

export function InvoiceCard({ invoice }: InvoiceCardProps) {
  // 计算是否超额
  const isOverLimit = invoice.overLimitCount > 0 || invoice.overLimitAmount > 0

  return (
    <Card className={`p-4 ${isOverLimit ? 'border-orange-500 border-2' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg">{invoice.customer?.name || '未知客户'}</h3>
        {isOverLimit && (
          <Badge variant="destructive" className="animate-pulse">
            超额预警
          </Badge>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">开票月份:</span>
          <span>{invoice.month}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">开票金额:</span>
          <span className="font-semibold text-lg">¥{invoice.amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">开票张数:</span>
          <span className="font-semibold">{invoice.count}张</span>
        </div>
        {isOverLimit && (
          <>
            {invoice.overLimitCount > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>超额张数:</span>
                <span className="font-semibold">+{invoice.overLimitCount}张</span>
              </div>
            )}
            {invoice.overLimitAmount > 0 && (
              <div className="flex justify-between text-orange-600">
                <span>超额金额:</span>
                <span className="font-semibold">¥{invoice.overLimitAmount.toLocaleString()}</span>
              </div>
            )}
          </>
        )}
        {invoice.contract && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">关联合同:</span>
            <span>{invoice.contract.code}</span>
          </div>
        )}
        {invoice.remark && (
          <div className="pt-2 border-t">
            <span className="text-muted-foreground">备注:</span>
            <p className="mt-1">{invoice.remark}</p>
          </div>
        )}
        <div className="pt-2 border-t text-xs text-muted-foreground">
          {new Date(invoice.createdAt).toLocaleDateString('zh-CN')}
        </div>
      </div>
    </Card>
  )
}
