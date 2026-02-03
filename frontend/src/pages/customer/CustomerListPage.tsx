import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getScrmApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search, Building2, Users, Edit, Trash2 } from 'lucide-react'
import type { CreateCustomerDto, UpdateCustomerDto } from '@/models'
import { CompanyModal } from './CompanyModal'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface Company {
  id: string
  name: string
  shortName?: string
  code?: string
  industry?: string
  scale?: string
  address?: string
  website?: string
  customerLevel: number
  sourceChannel?: string
  followUserId?: string
  followUserName?: string
  tags?: string
  remark?: string
  status: number
  firstContactDate?: string
  contractDate?: string
  createdAt: string
  updatedAt: string
  contacts?: Array<{
    id: string
    name: string
    phone: string
    position?: string
    isPrimary: boolean
    isDecision: boolean
  }>
  _count?: {
    contacts: number
    contracts: number
  }
}

const customerLevelMap: Record<number, string> = {
  0: '线索公司',
  1: '意向客户',
  2: '正式客户',
  3: 'VIP客户',
}

const customerLevelColors: Record<number, string> = {
  0: 'bg-gray-100 text-gray-700',
  1: 'bg-blue-100 text-blue-700',
  2: 'bg-green-100 text-green-700',
  3: 'bg-purple-100 text-purple-700',
}

export const CustomerListPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingCompanyId, setDeletingCompanyId] = useState<string | null>(null)
  const [levelFilter, setLevelFilter] = useState<number | null>(null)
  const pageSize = 10

  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['customers', page, searchTerm, levelFilter],
    queryFn: async () => {
      const api = getScrmApi()
      const response = await api.customerControllerFindAll({
        page: page - 1,
        pageSize,
        keyword: searchTerm || undefined,
        customerLevel: levelFilter ?? undefined,
      })
      return response as any
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const api = getScrmApi()
      await api.customerControllerRemove(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      setDeleteDialogOpen(false)
    },
  })

  const companies = data?.data || []
  const total = data?.total || companies.length

  const handleEdit = (company: Company) => {
    setEditingCompany(company)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeletingCompanyId(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (deletingCompanyId) {
      deleteMutation.mutate(deletingCompanyId)
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingCompany(null)
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">公司管理</h1>
          <p className="text-sm text-gray-500 mt-1">共 {total} 家公司</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          新建公司
        </Button>
      </div>

      {/* 搜索和筛选栏 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="search"
                placeholder="搜索公司名称、简称、编码..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={levelFilter === null ? "default" : "outline"}
                size="sm"
                onClick={() => setLevelFilter(null)}
              >
                全部
              </Button>
              <Button
                variant={levelFilter === 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setLevelFilter(0)}
              >
                线索
              </Button>
              <Button
                variant={levelFilter === 1 ? "default" : "outline"}
                size="sm"
                onClick={() => setLevelFilter(1)}
              >
                意向
              </Button>
              <Button
                variant={levelFilter === 2 ? "default" : "outline"}
                size="sm"
                onClick={() => setLevelFilter(2)}
              >
                正式
              </Button>
              <Button
                variant={levelFilter === 3 ? "default" : "outline"}
                size="sm"
                onClick={() => setLevelFilter(3)}
              >
                VIP
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 公司列表 */}
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
      ) : companies.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            暂无公司数据
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {companies.map((company: Company) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/customers/${company.id}`}
                          className="text-sm font-semibold text-gray-900 hover:text-blue-600 truncate block"
                        >
                          {company.name}
                        </Link>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                          {company.shortName && <span>简称: {company.shortName}</span>}
                          {company.industry && <span>{company.industry}</span>}
                          {company.scale && <span>{company.scale}</span>}
                        </div>
                        {/* 联系人信息 */}
                        {company.contacts && company.contacts.length > 0 && (
                          <div className="mt-2 flex items-center gap-2 flex-wrap">
                            <Users className="w-3 h-3 text-gray-400" />
                            {company.contacts.slice(0, 3).map((contact) => (
                              <span
                                key={contact.id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-gray-50 text-gray-600"
                              >
                                {contact.name}
                                {contact.position && `(${contact.position})`}
                              </span>
                            ))}
                            {company.contacts.length > 3 && (
                              <span className="text-xs text-gray-400">
                                +{company.contacts.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-xs text-gray-500">
                        {company.followUserName || '未分配'}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {company._count?.contacts || 0} 联系人 · {company._count?.contracts || 0} 合同
                      </div>
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full ${customerLevelColors[company.customerLevel]}`}>
                      {customerLevelMap[company.customerLevel]}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(company)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(company.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

      {/* 新建/编辑弹窗 */}
      <CompanyModal
        open={isModalOpen}
        onClose={handleModalClose}
        company={editingCompany}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['customers'] })
          handleModalClose()
        }}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该公司吗？此操作将同时删除相关联的合同、发票等数据，且不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
