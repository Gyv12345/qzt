import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getScrmApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Search, Phone, Mail, Building2, Edit, Trash2 } from 'lucide-react'
import type { CreateContactDto, UpdateContactDto } from '@/models'
import { ContactModal } from './ContactModal'
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

export const ContactListPage = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null)
  const pageSize = 10

  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['contacts', page, searchTerm],
    queryFn: async () => {
      const api = getScrmApi()
      const response = await api.contactControllerFindAll({
        page,
        pageSize,
        keyword: searchTerm || undefined,
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
          <h1 className="text-2xl font-bold text-gray-900">联系人管理</h1>
          <p className="text-sm text-gray-500 mt-1">共 {total} 位联系人</p>
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
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="search"
              placeholder="搜索联系人姓名、电话、邮箱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* 联系人列表 */}
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
      ) : contacts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            暂无联系人数据
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact: Contact) => (
            <Card key={contact.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <span className="text-green-600 font-semibold">
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900">
                          {contact.name}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </span>
                          {contact.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {contact.email}
                            </span>
                          )}
                        </div>
                        {(contact.position || contact.department) && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {contact.position}
                            {contact.position && contact.department && ' / '}
                            {contact.department}
                          </div>
                        )}
                      </div>
                    </div>
                    {/* 关联公司 */}
                    {contact.companies && contact.companies.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        {contact.companies.map((company) => (
                          <span
                            key={company.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded bg-blue-50 text-blue-600"
                          >
                            {company.name}
                            {company.isPrimary && (
                              <span className="text-xs">(主要)</span>
                            )}
                            {company.isDecision && (
                              <span className="text-xs">(决策)</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                      {contact.status === 1 ? '启用' : '禁用'}
                    </div>
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
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
