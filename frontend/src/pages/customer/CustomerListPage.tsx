import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getScrmApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search } from 'lucide-react'

export const CustomerListPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const { data, isLoading, error } = useQuery({
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

  const customers = data?.data || []
  const total = customers.length

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客户管理</h1>
          <p className="text-sm text-gray-500 mt-1">共 {total} 位客户</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          新建客户
        </Button>
      </div>

      {/* 搜索栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="搜索客户名称、电话、邮箱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 客户列表 */}
      {isLoading ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            加载中...
          </CardContent>
        </Card>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-red-500">
            加载失败，请重试
          </CardContent>
        </Card>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            暂无客户数据
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {customers.map((customer: any) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-semibold">
                          {customer.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/customers/${customer.id}`}
                          className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate block"
                        >
                          {customer.name}
                        </Link>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {customer.phone}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-gray-500">
                        {customer.company || '个人客户'}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                      {customer.status === 'ACTIVE' ? '活跃' : 'inactive'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 分页 */}
      {total > pageSize && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            上一页
          </Button>
          <div className="flex items-center px-3 text-sm text-gray-600">
            第 {page} 页，共 {Math.ceil(total / pageSize)} 页
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / pageSize)}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  )
}
