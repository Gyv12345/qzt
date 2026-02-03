import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search, MessageSquare, Calendar, User } from 'lucide-react'

interface FollowRecord {
  id: string
  content: string
  followDate: string
  nextFollowDate?: string
  customerId: string
  customerName: string
  contactId?: string
  contactName?: string
  createdBy: string
  createdByName: string
  createdAt: string
  updatedAt: string
}

export const Route = createFileRoute('/_authenticated/follow-records')({
  component: FollowRecordListPage,
})

function FollowRecordListPage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  // 从 URL 读取状态
  const page = (search as any).page || 1
  const keyword = (search as any).keyword || ''
  const pageSize = 10

  const { data, isLoading, error } = useQuery({
    queryKey: ['follow-records', page, keyword],
    queryFn: async () => {
      const api = getScrmApi()
      const response = await api.followRecordControllerFindAll({
        page: page - 1,
        pageSize,
        keyword: keyword || undefined,
      })
      return response as any
    },
  })

  const followRecords = data?.data || []
  const total = data?.total || followRecords.length

  // 更新 URL 状态
  const updateSearch = (updates: Record<string, any>) => {
    navigate({
      search: (prev) => ({ ...prev, ...updates }),
    })
  }

  const handleSearch = (value: string) => {
    updateSearch({ keyword: value, page: 1 })
  }

  const handlePageChange = (newPage: number) => {
    updateSearch({ page: newPage })
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('zh-CN')
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">跟进记录</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">共 {total} 条记录</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          新建记录
        </Button>
      </div>

      {/* 搜索栏 */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="搜索跟进内容、客户名称..."
              value={keyword}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 跟进记录列表 */}
      {isLoading ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
            加载中...
          </CardContent>
        </Card>
      ) : error ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="py-12 text-center text-red-500">
            加载失败，请重试
          </CardContent>
        </Card>
      ) : followRecords.length === 0 ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
            暂无跟进记录
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {followRecords.map((record: FollowRecord) => (
            <Card key={record.id} className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        onClick={() => navigate({ to: `/customers/${record.customerId}` })}
                        className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate"
                      >
                        {record.customerName}
                      </button>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                        {formatDate(record.followDate)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">
                      {record.content}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {record.createdByName}
                      </div>
                      {record.contactName && (
                        <div>联系人: {record.contactName}</div>
                      )}
                      {record.nextFollowDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          下次: {formatDate(record.nextFollowDate)}
                        </div>
                      )}
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
            onClick={() => handlePageChange(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            上一页
          </Button>
          <div className="flex items-center px-3 text-sm text-gray-600 dark:text-gray-400">
            第 {page} 页，共 {Math.ceil(total / pageSize)} 页
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= Math.ceil(total / pageSize)}
          >
            下一页
          </Button>
        </div>
      )}
    </div>
  )
}
