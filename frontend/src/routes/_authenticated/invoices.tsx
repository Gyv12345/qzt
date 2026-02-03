import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search, Receipt, Calendar, DollarSign } from 'lucide-react'

interface Invoice {
  id: string
  invoiceNo: string
  amount: number
  invoiceDate: string
  status: string
  contractId: string
  contractNo: string
  createdAt: string
  updatedAt: string
}

export const Route = createFileRoute('/_authenticated/invoices')({
  component: InvoiceListPage,
})

function InvoiceListPage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()

  // 从 URL 读取状态
  const page = (search as any).page || 1
  const keyword = (search as any).keyword || ''
  const pageSize = 10

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoices', page, keyword],
    queryFn: async () => {
      const api = getScrmApi()
      const response = await api.invoiceControllerFindAll({
        page: page - 1,
        pageSize,
        keyword: keyword || undefined,
      })
      return response as any
    },
  })

  const invoices = data?.data || []
  const total = data?.total || invoices.length

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

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">开票管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">共 {total} 张发票</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          新建发票
        </Button>
      </div>

      {/* 搜索栏 */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="搜索发票编号..."
              value={keyword}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 发票列表 */}
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
      ) : invoices.length === 0 ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
            暂无发票数据
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice: Invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                        <Receipt className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-white">
                          {invoice.invoiceNo}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {invoice.contractNo}
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            ¥{(invoice.amount / 10000).toFixed(2)}万
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {invoice.invoiceDate}
                          </div>
                        </div>
                      </div>
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
