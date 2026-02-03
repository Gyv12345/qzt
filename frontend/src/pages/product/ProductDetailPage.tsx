import { useParams } from 'react-router-dom'
import { useProduct } from '@/services'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: product, isLoading, error } = useProduct(id!)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">加载中...</div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-red-500">
          <div className="text-lg">产品不存在</div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/products')}
          >
            返回列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/products')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            产品代码: {product.code}
          </p>
        </div>
        <Button>编辑产品</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">产品信息</h2>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">产品代码</span>
                <p className="font-mono text-sm mt-1">{product.code}</p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">价格</span>
                <p className="text-2xl font-bold text-primary mt-1">
                  ¥{product.price.toLocaleString()}
                </p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">开票额度(月)</span>
                <p className="text-lg font-semibold mt-1">
                  ¥{product.invoiceLimit.toLocaleString()}
                </p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">包含张数(月)</span>
                <p className="text-lg font-semibold mt-1">
                  {product.invoiceCount} 张
                </p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">超额单价</span>
                <p className="text-lg font-semibold mt-1">
                  ¥{product.overLimitPrice}
                </p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">状态</span>
                <div className="mt-1">
                  <Badge variant={product.status === 1 ? 'default' : 'secondary'}>
                    {product.status === 1 ? '启用' : '禁用'}
                  </Badge>
                </div>
              </div>

              {product.description && (
                <div className="pt-4 border-t">
                  <span className="text-sm text-muted-foreground">产品描述</span>
                  <p className="text-sm mt-2 leading-relaxed">{product.description}</p>
                </div>
              )}

              <div className="pt-4 border-t text-xs text-muted-foreground">
                <div>创建时间: {new Date(product.createdAt).toLocaleString()}</div>
                <div>更新时间: {new Date(product.updatedAt).toLocaleString()}</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">流程配置</h2>

            {!product.flows || product.flows.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div>暂无流程配置</div>
                <div className="text-sm mt-2">点击下方按钮添加流程</div>
                <Button className="mt-4">添加流程</Button>
              </div>
            ) : (
              <div className="space-y-4">
                {product.flows.map((flow) => (
                  <div
                    key={flow.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{flow.name}</h3>
                          <Badge variant={flow.enabled ? 'default' : 'secondary'}>
                            {flow.enabled ? '启用' : '禁用'}
                          </Badge>
                          <Badge variant="outline">
                            {flow.type === 'NODE' ? '节点流程' : '周期流程'}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div>流程类型: {flow.type}</div>
                          <div className="mt-1">
                            创建时间: {new Date(flow.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          编辑
                        </Button>
                        <Button variant="ghost" size="sm">
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
