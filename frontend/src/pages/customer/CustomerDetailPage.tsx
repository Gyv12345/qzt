import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { getScrmApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Phone, Mail, Building, Calendar } from 'lucide-react'
import { FollowRecordTimeline } from '@/components/FollowRecordTimeline'

export const CustomerDetailPage = () => {
  const { id } = useParams<{ id: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const api = getScrmApi()
      const response = await api.customerControllerFindOne(id!)
      return response as any
    },
    enabled: !!id,
  })

  const customer = data?.data

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="text-red-500">加载失败，客户不存在</div>
        <Link to="/customers">
          <Button variant="outline">返回列表</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 头部导航 */}
      <div className="flex items-center gap-4">
        <Link to="/customers">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            返回
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">客户详情</h1>
        </div>
        <Button variant="outline">编辑</Button>
      </div>

      {/* 客户基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-600 text-xl font-semibold">
                {customer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-xl">{customer.name}</div>
              <div className="text-sm text-gray-500 font-normal">
                {customer.status === 'ACTIVE' ? '活跃客户' : '非活跃客户'}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">电话</div>
                <div className="text-sm font-medium">{customer.phone}</div>
              </div>
            </div>

            {customer.email && (
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">邮箱</div>
                  <div className="text-sm font-medium">{customer.email}</div>
                </div>
              </div>
            )}

            {customer.company && (
              <div className="flex items-start gap-3">
                <Building className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">公司</div>
                  <div className="text-sm font-medium">{customer.company}</div>
                </div>
              </div>
            )}

            {customer.address && (
              <div className="flex items-start gap-3 sm:col-span-2">
                <Building className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <div className="text-sm text-gray-500">地址</div>
                  <div className="text-sm font-medium">{customer.address}</div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">创建时间</div>
                <div className="text-sm font-medium">
                  {new Date(customer.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-sm text-gray-500">更新时间</div>
                <div className="text-sm font-medium">
                  {new Date(customer.updatedAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          </div>

          {customer.remark && (
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm text-gray-500 mb-2">备注</div>
              <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                {customer.remark}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 跟进记录 */}
      <Card>
        <CardHeader>
          <CardTitle>跟进记录</CardTitle>
        </CardHeader>
        <CardContent>
          <FollowRecordTimeline customerId={customer.id} />
        </CardContent>
      </Card>
    </div>
  )
}
