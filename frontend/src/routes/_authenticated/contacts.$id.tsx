import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Phone, Mail, Building2, Calendar, User } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/contacts/$id')({
  component: ContactDetailPage,
})

function ContactDetailPage() {
  const { id } = Route.useParams()
  const navigate = Route.useNavigate()

  const { data, isLoading, error } = useQuery({
    queryKey: ['contact', id],
    queryFn: async () => {
      const api = getScrmApi()
      const response = await api.contactControllerFindOne(id)
      return response as any
    },
    enabled: !!id,
  })

  const contact = data?.data

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500 dark:text-gray-400">加载中...</div>
      </div>
    )
  }

  if (error || !contact) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-red-500">加载失败，联系人不存在</div>
        <Button
          variant="outline"
          onClick={() => navigate({ to: '/contacts' })}
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
          onClick={() => navigate({ to: '/contacts' })}
        >
          <ArrowLeft className="w-4 h-4" />
          返回
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">联系人详情</h1>
        </div>
        <Button variant="outline">编辑</Button>
      </div>

      {/* 联系人基本信息 */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 text-xl font-semibold">
                {contact.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-xl text-gray-900 dark:text-white">{contact.name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                {contact.position || '职位未知'} {contact.department && `· ${contact.department}`}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {contact.phone && (
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">电话</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{contact.phone}</div>
                </div>
              </div>
            )}

            {contact.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">邮箱</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{contact.email}</div>
                </div>
              </div>
            )}

            {contact.wechat && (
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">微信</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{contact.wechat}</div>
                </div>
              </div>
            )}

            {contact.birthdate && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">生日</div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{contact.birthdate}</div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">创建时间</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {new Date(contact.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">更新时间</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {new Date(contact.updatedAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          </div>

          {contact.remark && (
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">备注</div>
              <div className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                {contact.remark}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 关联公司 */}
      {contact.companies && contact.companies.length > 0 && (
        <Card className="dark:bg-gray-800 dark:border-gray-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-white">
              <Building2 className="w-5 h-5" />
              关联公司
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {contact.companies.map((company: any) => (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-3 border dark:border-gray-700 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{company.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {company.isPrimary && '主要联系人 · '}
                      {company.isDecision && '决策者'}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate({ to: `/customers/${company.id}` })}
                  >
                    查看详情
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
