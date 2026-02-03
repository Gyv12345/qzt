import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getScrmApi } from '@/services'
import type { Product } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, Package } from 'lucide-react'

export const ProductListMobile = () => {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<number | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [hasMore, setHasMore] = useState(true)
  const isLoadingMore = useRef(false)
  const pageSize = 20

  // 获取产品列表
  const { isLoading, error, data: response } = useQuery({
    queryKey: ['products', page, searchTerm, statusFilter],
    queryFn: async () => {
      const api = getScrmApi()
      return await api.productControllerFindAll({
        page: page - 1,
        pageSize,
        keyword: searchTerm || undefined,
        status: statusFilter,
      })
    },
  })

  // 处理查询成功的数据
  useEffect(() => {
    if (response) {
      const newProducts = response.data || []

      if (page === 1) {
        setAllProducts(newProducts)
      } else {
        setAllProducts((prev) => [...prev, ...newProducts])
      }

      setHasMore(newProducts.length >= pageSize)
      isLoadingMore.current = false
    }
  }, [response, page, searchTerm, statusFilter])

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setPage(1)
    setAllProducts([])
    setHasMore(true)
  }

  const handleLoadMore = () => {
    if (isLoadingMore.current || !hasMore) return
    isLoadingMore.current = true
    setPage((prev) => prev + 1)
  }

  // 监听滚动实现无限加载
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const windowHeight = window.innerHeight
      const docHeight = document.documentElement.scrollHeight

      if (docHeight - scrollTop - windowHeight < 100 && !isLoading && hasMore && !isLoadingMore.current) {
        handleLoadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isLoading, hasMore])

  const products = allProducts

  const getStatusTag = (status: number) => {
    return status === 1 ? (
      <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">启用</span>
    ) : (
      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">禁用</span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部搜索栏 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="搜索产品名称、代码..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <Button size="sm" className="h-10 px-3">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 筛选栏 */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <Select
          value={statusFilter !== undefined ? String(statusFilter) : 'all'}
          onValueChange={(v) => setStatusFilter(v === 'all' ? undefined : Number(v))}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="筛选状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="1">启用</SelectItem>
            <SelectItem value="0">禁用</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 产品列表 */}
      {isLoading && page === 1 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="text-red-500 mb-4">加载失败</div>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="text-gray-500 mb-2">暂无产品数据</div>
          <div className="text-sm text-gray-400">点击右上角 + 添加产品</div>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {products.map((product) => (
            <Card key={product.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-base font-semibold text-gray-900 truncate">{product.name}</h3>
                      {getStatusTag(product.status)}
                    </div>
                    <p className="text-sm text-gray-500 mb-1">代码: {product.code}</p>
                    <p className="text-lg font-bold text-blue-600 mb-2">
                      ¥{product.price.toLocaleString()}
                    </p>
                    {product.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{product.description}</p>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                      <div>
                        <span className="text-gray-400">额度:</span> {product.invoiceLimit}张/月
                      </div>
                      <div>
                        <span className="text-gray-400">套餐:</span> {product.invoiceCount}张
                      </div>
                      <div>
                        <span className="text-gray-400">超额:</span> ¥{product.overLimitPrice}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* 加载更多指示器 */}
          {hasMore && products.length > 0 && (
            <div className="flex justify-center py-4">
              <div className="text-sm text-gray-500">
                {isLoadingMore.current ? '加载中...' : '下拉加载更多'}
              </div>
            </div>
          )}

          {/* 没有更多数据 */}
          {!hasMore && products.length > 0 && (
            <div className="flex justify-center py-4">
              <div className="text-sm text-gray-400">没有更多了</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
