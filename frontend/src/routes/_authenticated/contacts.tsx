import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getScrmApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search, Phone, Mail, Building2, Edit, Trash2 } from 'lucide-react'
import { ContactModal } from '@/pages/contact/ContactModal'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  wechat?: string
  position?: string
  department?: string
  birthdate?: string
  tags?: string
  remark?: string
  status: number
  createdAt: string
  updatedAt: string
  companies?: Array<{
    id: string
    name: string
    isPrimary: boolean
    isDecision: boolean
  }>
}

export const Route = createFileRoute('/_authenticated/contacts')({
  component: ContactListPage,
})

function ContactListPage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null)

  // 从 URL 读取状态
  const page = (search as any).page || 1
  const keyword = (search as any).keyword || ''
  const pageSize = 10

  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['contacts', page, keyword],
    queryFn: async () => {
      const api = getScrmApi()
      const response = await api.contactControllerFindAll({
        page: page - 1,
        pageSize,
        keyword: keyword || undefined,
      })
      return response as any
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const api = getScrmApi()
      await api.contactControllerRemove(id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setDeleteDialogOpen(false)
    },
  })

  const contacts = data?.data || []
  const total = data?.total || contacts.length

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

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
    setIsModalOpen(true)
  }

  const handleDelete = (id: string) => {
    setDeletingContactId(id)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (deletingContactId) {
      deleteMutation.mutate(deletingContactId)
    }
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setEditingContact(null)
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">联系人管理</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">共 {total} 位联系人</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus className="w-4 h-4" />
          新建联系人
        </Button>
      </div>

      {/* 搜索栏 */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="搜索联系人姓名、电话、邮箱..."
              value={keyword}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 联系人列表 */}
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
      ) : contacts.length === 0 ? (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardContent className="py-12 text-center text-gray-500 dark:text-gray-400">
            暂无联系人数据
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact: Contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow dark:bg-gray-800 dark:border-gray-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-400 text-sm font-semibold">
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => navigate({ to: `/contacts/${contact.id}` })}
                          className="text-sm font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 truncate block text-left"
                        >
                          {contact.name}
                        </button>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-3">
                          {contact.position && <span>{contact.position}</span>}
                          {contact.department && <span>· {contact.department}</span>}
                        </div>
                        {/* 联系方式 */}
                        <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                          {contact.phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {contact.phone}
                            </div>
                          )}
                          {contact.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{contact.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(contact)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(contact.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
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

      {/* 新建/编辑弹窗 */}
      <ContactModal
        open={isModalOpen}
        onClose={handleModalClose}
        contact={editingContact}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['contacts'] })
          handleModalClose()
        }}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="dark:bg-gray-800 dark:border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="dark:text-white">确认删除</AlertDialogTitle>
            <AlertDialogDescription className="dark:text-gray-400">
              确定要删除该联系人吗？此操作不可恢复。
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
