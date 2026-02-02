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

interface ProductTableProps {
  products: any[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onEdit: (product: any) => void
}

export function ProductTable({
  products,
  total,
  page,
  pageSize,
  onPageChange,
  onEdit,
}: ProductTableProps) {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>产品名称</TableHead>
            <TableHead>产品代码</TableHead>
            <TableHead>价格</TableHead>
            <TableHead>开票额度</TableHead>
            <TableHead>包含张数</TableHead>
            <TableHead>超额单价</TableHead>
            <TableHead>状态</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-medium">
                <div>
                  <div>{product.name}</div>
                  {product.description && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                      {product.description}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="font-mono text-xs">{product.code}</TableCell>
              <TableCell>¥{product.price.toLocaleString()}</TableCell>
              <TableCell>¥{product.invoiceLimit.toLocaleString()}/月</TableCell>
              <TableCell>{product.invoiceCount}张</TableCell>
              <TableCell>¥{product.overLimitPrice}</TableCell>
              <TableCell>
                <Badge variant={product.status === 1 ? 'default' : 'secondary'}>
                  {product.status === 1 ? '启用' : '禁用'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onEdit(product)}>
                  编辑
                </Button>
              </TableCell>
            </TableRow>
          ))}
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
