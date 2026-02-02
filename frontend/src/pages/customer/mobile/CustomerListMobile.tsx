import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getScrmApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search, ChevronRight, Phone, Building2, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

// 客户等级映射
const getLevelInfo = (level: number) => {
  const levelMap: Record<number, { text: string; color: string }> = {
    0: { text: '潜在', color: 'bg-gray-100 text-gray-700' },
    1: { text: '意向', color: 'bg-blue-100 text-blue-700' },
    2: { text: '正式', color: 'bg-green-100 text-green-700' },
    3: { text: 'VIP', color: 'bg-purple-100 text-purple-700' },
  }
  return levelMap[level] || levelMap[0]
}

export const CustomerListMobile = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [allCustomers, setAllCustomers] = useState<any[]>([])
  const [hasMore, setHasMore] = useState(true)
  const isLoadingMore = useRef(false)
  const queryClient = useQueryClient()
  const pageSize = 20

  // 获取客户数据
  const { isLoading, error } = useQuery({
    queryKey: ['customers', page, searchTerm],
    queryFn: async () => {
      const api = getScrmApi()
      const response = await api.customerControllerFindAll({
        page: page - 1,
        pageSize,
        keyword: searchTerm || undefined,
      })
      return response as any
    },
  })

  // 处理查询成功的数据
  useEffect(() => {
    const data = queryClient.getQueryData(['customers', page, searchTerm]) as any
    if (data) {
      const newCustomers = data?.data || []

      if (page === 1) {
        // 第一页,替换数据
        setAllCustomers(newCustomers)
      } else {
        // 后续页,追加数据
        setAllCustomers((prev) => [...prev, ...newCustomers])
      }

      // 判断是否还有更多数据
      setHasMore(newCustomers.length >= pageSize)
      isLoadingMore.current = false
    }
  }, [page, searchTerm, queryClient])

  // 搜索处理
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
    setPage(1)
    setAllCustomers([])
    setHasMore(true)
  }, [])

  // 加载更多
  const handleLoadMore = useCallback(() => {
    if (isLoadingMore.current || !hasMore) return

    isLoadingMore.current = true
    setPage((prev) => prev + 1)
  }, [hasMore])

  // 监听滚动,实现自动加载更多
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const windowHeight = window.innerHeight
      const docHeight = document.documentElement.scrollHeight

      // 距离底部 100px 时触发加载
      if (docHeight - scrollTop - windowHeight < 100 && !isLoading && hasMore && !isLoadingMore.current) {
        handleLoadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isLoading, hasMore, handleLoadMore])

  const customers = allCustomers

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* 顶部搜索栏 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="搜索客户名称、电话..."
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

      {/* 客户列表 */}
      {isLoading && page === 1 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-gray-500">加载中...</div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="text-red-500 mb-4">加载失败</div>
          <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ['customers'] })}>
            重试
          </Button>
        </div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="text-gray-500 mb-2">暂无客户数据</div>
          <div className="text-sm text-gray-400">点击右上角 + 添加客户</div>
        </div>
      ) : (
        <div className="px-4 py-4 space-y-3">
          {customers.map((customer: any) => {
            const levelInfo = getLevelInfo(customer.customerLevel || 0)

            return (
              <Link
                key={customer.id}
                to={`/customers/${customer.id}`}
                className="block"
              >
                <Card className="hover:shadow-md transition-shadow active:scale-[0.98] transition-transform">
                  <CardContent className="p-4">
                    {/* 客户名称和等级 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold text-sm">
                            {customer.name?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">
                            {customer.name}
                          </div>
                          {customer.companyName && (
                            <div className="text-xs text-gray-500 truncate mt-0.5">
                              {customer.companyName}
                            </div>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>

                    {/* 客户信息 */}
                    <div className="space-y-2">
                      {customer.contactPhone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-600">{customer.contactPhone}</span>
                        </div>
                      )}

                      {customer.contactName && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-600">{customer.contactName}</span>
                        </div>
                      )}

                      {customer.createdAt && (
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span className="text-gray-500 text-xs">
                            {new Date(customer.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* 底部标签 */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <span className={cn('px-2 py-1 text-xs rounded-full', levelInfo.color)}>
                        {levelInfo.text}
                      </span>
                      {customer.followUser && (
                        <span className="text-xs text-gray-500">
                          跟进: {customer.followUser.name}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}

          {/* 加载更多指示器 */}
          {hasMore && customers.length > 0 && (
            <div className="flex justify-center py-4">
              <div className="text-sm text-gray-500">
                {isLoadingMore.current ? '加载中...' : '下拉加载更多'}
              </div>
            </div>
          )}

          {/* 没有更多数据 */}
          {!hasMore && customers.length > 0 && (
            <div className="flex justify-center py-4">
              <div className="text-sm text-gray-400">没有更多了</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
