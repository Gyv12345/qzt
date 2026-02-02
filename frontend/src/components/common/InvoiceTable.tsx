import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface InvoiceTableProps {
  invoices: any[]
  total: number
  page: number
  onPageChange: (page: number) => void
  onEdit: (invoice: any) => void
}

export function InvoiceTable({
  invoices,
  total,
  page,
  onPageChange,
  onEdit,
}: InvoiceTableProps) {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>客户名称</TableHead>
            <TableHead>开票月份</TableHead>
            <TableHead>开票金额</TableHead>
            <TableHead>开票张数</TableHead>
            <TableHead>超额张数</TableHead>
            <TableHead>超额金额</TableHead>
            <TableHead>关联合同</TableHead>
            <TableHead>备注</TableHead>
            <TableHead>创建时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const isOverLimit = invoice.overLimitCount > 0 || invoice.overLimitAmount > 0

            return (
              <TableRow
                key={invoice.id}
                className={isOverLimit ? 'bg-orange-50' : ''}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {invoice.customer?.name || '未知客户'}
                    {isOverLimit && (
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                    )}
                  </div>
                </TableCell>
                <TableCell>{invoice.month}</TableCell>
                <TableCell className="font-semibold">
                  ¥{invoice.amount?.toLocaleString() || 0}
                </TableCell>
                <TableCell className="font-semibold">
                  {invoice.count || 0}张
                </TableCell>
                <TableCell>
                  {invoice.overLimitCount > 0 ? (
                    <Badge variant="destructive">
                      +{invoice.overLimitCount}张
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {invoice.overLimitAmount > 0 ? (
                    <Badge variant="destructive">
                      ¥{invoice.overLimitAmount.toLocaleString()}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {invoice.contract ? (
                    <span className="text-sm">{invoice.contract.code}</span>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {invoice.remark || '-'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(invoice.createdAt).toLocaleDateString('zh-CN')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(invoice)}
                    >
                      编辑
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <div className="flex justify-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          上一页
        </Button>
        <span className="flex items-center px-4">第 {page} 页</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page * 10 >= total}
        >
          下一页
        </Button>
      </div>
    </div>
  )
}
