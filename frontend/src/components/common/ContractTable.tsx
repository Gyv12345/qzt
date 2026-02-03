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
import { Progress } from '@/components/ui/progress'

interface ContractTableProps {
  contracts: any[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function ContractTable({
  contracts,
  total,
  page,
  pageSize,
  onPageChange,
}: ContractTableProps) {
  const statusMap = {
    0: { text: '待收款', color: 'destructive' as const },
    1: { text: '部分收款', color: 'default' as const },
    2: { text: '已收全', color: 'default' as const },
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>合同编号</TableHead>
            <TableHead>客户名称</TableHead>
            <TableHead>产品名称</TableHead>
            <TableHead>合同金额</TableHead>
            <TableHead>已收金额</TableHead>
            <TableHead>收款进度</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>服务周期</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => {
            const status = statusMap[contract.status] || statusMap[0]
            const progress = contract.amount > 0 ? (contract.paidAmount / contract.amount) * 100 : 0

            return (
              <TableRow key={contract.id}>
                <TableCell className="font-mono text-xs">
                  {contract.contractNo}
                </TableCell>
                <TableCell className="font-medium">
                  {contract.customer?.name || '-'}
                </TableCell>
                <TableCell>{contract.product?.name || '-'}</TableCell>
                <TableCell>¥{contract.amount.toLocaleString()}</TableCell>
                <TableCell className="text-green-600 font-medium">
                  ¥{contract.paidAmount.toLocaleString()}
                </TableCell>
                <TableCell className="min-w-[120px]">
                  <div className="space-y-1">
                    <Progress value={progress} className="h-2" />
                    <div className="text-xs text-muted-foreground text-right">
                      {progress.toFixed(1)}%
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={status.color}>{status.text}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  <div>
                    {new Date(contract.serviceStart).toLocaleDateString()}
                  </div>
                  <div className="text-xs">
                    ~ {new Date(contract.serviceEnd).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm">
                      查看
                    </Button>
                    <Button variant="ghost" size="sm">
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
        <span className="flex items-center px-4 text-sm text-muted-foreground">
          第 {page} 页 / 共 {Math.ceil(total / pageSize)} 页
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page * pageSize >= total}
        >
          下一页
        </Button>
      </div>
    </div>
  )
}
