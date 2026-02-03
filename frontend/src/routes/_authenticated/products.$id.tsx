import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Package, DollarSign, Calendar, Barcode } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/products/$id')({
  component: ProductDetailPage,
})

function ProductDetailPage() {
  const { id } = Route.useParams()
  const navigate = Route.useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const api = getScrmApi()
      const response = await api.productControllerFindOne(id)
      return response as any
    },
    enabled: !!id,
  })

  const product = data?.data

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-red-500">加载失败，产品不存在</div>
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/products' })}
        >
          返回列表
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          onClick={() => navigate({ to: '/products' })}
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">产品详情</h1>
        </div>
        <Button variant="outline">编辑</Button>
      </div>

      {/* 产品基本信息 */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Package className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <div className="text-xl text-gray-900 dark:text-white">{product.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                {product.status === 1 ? '在售' : '停售'}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {product.code && (
              <div className="flex items-start gap-3">
                <Barcode className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">产品编码</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.code}</div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">价格</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  ¥{product.price.toFixed(2)}
                </div>
              </div>
            </div>

            {product.category && (
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">分类</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.category}</div>
                </div>
              </div>
            )}

            {product.unit && (
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">单位</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{product.unit}</div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">创建时间</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {new Date(product.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">更新时间</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {new Date(product.updatedAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          </div>

          {product.description && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">产品描述</div>
              <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                {product.description}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
