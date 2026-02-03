import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getScrmApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Phone, Mail, Building2, Edit, Calendar, User, Building } from 'lucide-react'
import { ContactModal } from './ContactModal'

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
    relation?: string
    position?: string
  }>
}

export const ContactDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const api = getScrmApi()
      const response = await api.contactControllerFindOne(id!)
      return response as any
    },
    enabled: !!id,
  })

  const contact = data?.data

  const handleModalClose = () => {
    setIsModalOpen(false)
    queryClient.invalidateQueries({ queryKey: ['contact', id] })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">加载中...</p>
      </div>
    )
  }

  if (error || !contact) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-red-500">加载失败</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/contacts')}>
          返回列表
        </Button>
      </div>
    )
  }

  const parseTags = (tagsStr?: string) => {
    if (!tagsStr) return []
    try {
      return JSON.parse(tagsStr)
    } catch {
      return tagsStr.split(',').map(t => t.trim()).filter(Boolean)
    }
  }

  const tags = parseTags(contact.tags)

  return (
    <div className="space-y-6">
      {/* 页面标题和操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/contacts">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{contact.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{contact.phone}</p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setIsModalOpen(true)}>
          <Edit className="w-4 h-4" />
          编辑
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧：基本信息 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 基本资料 */}
          <Card>
            <CardHeader>
              <CardTitle>基本资料</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">姓名</p>
                  <p className="font-medium">{contact.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">手机号</p>
                  <p className="font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {contact.phone}
                  </p>
                </div>
                {contact.email && (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">邮箱</p>
                    <p className="font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      {contact.email}
                    </p>
                  </div>
                )}
                {contact.wechat && (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">微信号</p>
                    <p className="font-medium">{contact.wechat}</p>
                  </div>
                )}
                {contact.position && (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">职位</p>
                    <p className="font-medium flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      {contact.position}
                    </p>
                  </div>
                )}
                {contact.department && (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">部门</p>
                    <p className="font-medium flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      {contact.department}
                    </p>
                  </div>
                )}
                {contact.birthdate && (
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">生日</p>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      {contact.birthdate.split('T')[0]}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 关联公司 */}
          {contact.companies && contact.companies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  关联公司
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {contact.companies.map((company) => (
                    <div
                      key={company.id}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <Link
                          to={`/companies/${company.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {company.name}
                        </Link>
                        <div className="text-sm text-gray-500 mt-1">
                          {company.position && <span>{company.position}</span>}
                          {company.position && company.relation && ' · '}
                          {company.relation && <span>{company.relation}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {company.isPrimary && (
                          <Badge variant="secondary">主要联系人</Badge>
                        )}
                        {company.isDecision && (
                          <Badge variant="default">决策人</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 备注 */}
          {contact.remark && (
            <Card>
              <CardHeader>
                <CardTitle>备注</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{contact.remark}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 右侧：状态和标签 */}
        <div className="space-y-6">
          {/* 状态 */}
          <Card>
            <CardHeader>
              <CardTitle>状态</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant={contact.status === 1 ? 'default' : 'secondary'}>
                {contact.status === 1 ? '启用' : '禁用'}
              </Badge>
            </CardContent>
          </Card>

          {/* 标签 */}
          {tags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>标签</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 时间信息 */}
          <Card>
            <CardHeader>
              <CardTitle>时间信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">创建时间</span>
                <span>{new Date(contact.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">更新时间</span>
                <span>{new Date(contact.updatedAt).toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 编辑弹窗 */}
      <ContactModal
        open={isModalOpen}
        onClose={handleModalClose}
        contact={contact}
        onSuccess={handleModalClose}
      />
    </div>
  )
}
