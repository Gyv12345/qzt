import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Product } from '@/types'
import { useNavigate } from 'react-router-dom'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate()

  return (
    <Card
      className="p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/products/${product.id}`)}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-lg">{product.name}</h3>
        <Badge variant={product.status === 1 ? 'default' : 'secondary'}>
          {product.status === 1 ? '启用' : '禁用'}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">代码:</span>
          <span className="font-mono text-xs">{product.code}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">价格:</span>
          <span className="font-semibold text-primary">¥{product.price.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">开票额度:</span>
          <span>¥{product.invoiceLimit.toLocaleString()}/月</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">包含张数:</span>
          <span>{product.invoiceCount}张/月</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">超额单价:</span>
          <span>¥{product.overLimitPrice}</span>
        </div>
        {product.description && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
          </div>
        )}
      </div>
    </Card>
  )
}
