import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FollowType } from '@/types'
import {
  ArrowLeft,
  Phone,
  Mail,
  Building,
  Calendar,
  MessageCircle,
  Plus,
  PhoneCall,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const CustomerDetailMobile = () => {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [followDialogOpen, setFollowDialogOpen] = useState(false)
  const [followType, setFollowType] = useState<FollowType>(FollowType.PHONE)
  const [followContent, setFollowContent] = useState('')

  // 获取客户详情
  const { data, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const api = getScrmApi()
      const response = await api.customerControllerFindOne(id!)
      return response as any
    },
    enabled: !!id,
  })

  // 创建跟进记录
  const createFollowMutation = useMutation({
    mutationFn: async (_data: { customerId: string; type: FollowType; content: string }) => {
      // 注意：需要后端实现添加跟进记录的API
      // const api = getScrmApi()
      // const response = await api.followRecordControllerCreate(data)
      // return response
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] })
      setFollowDialogOpen(false)
      setFollowContent('')
      setFollowType(FollowType.PHONE)
    },
  })

  const customer = data?.data

  const handleCall = () => {
    if (customer?.contactPhone) {
      window.location.href = `tel:${customer.contactPhone}`
    }
  }

  const handleSubmitFollow = () => {
    if (!followContent.trim() || !id) return
    createFollowMutation.mutate({
      customerId: id,
      type: followType,
      content: followContent,
    })
  }

  const getFollowTypeIcon = (type: FollowType) => {
    const icons = {
      [FollowType.PHONE]: PhoneCall,
      [FollowType.WECHAT]: MessageCircle,
      [FollowType.VISIT]: Building,
      [FollowType.EMAIL]: Mail,
      [FollowType.OTHER]: Plus,
    }
    return icons[type] || Plus
  }

  const getFollowTypeLabel = (type: FollowType) => {
    const labels = {
      [FollowType.PHONE]: '电话',
      [FollowType.WECHAT]: '微信',
      [FollowType.VISIT]: '上门',
      [FollowType.EMAIL]: '邮件',
      [FollowType.OTHER]: '其他',
    }
    return labels[type] || '其他'
  }

  const getFollowTypeColor = (type: FollowType) => {
    const colors = {
      [FollowType.PHONE]: 'bg-blue-100 text-blue-700',
      [FollowType.WECHAT]: 'bg-green-100 text-green-700',
      [FollowType.VISIT]: 'bg-purple-100 text-purple-700',
      [FollowType.EMAIL]: 'bg-orange-100 text-orange-700',
      [FollowType.OTHER]: 'bg-gray-100 text-gray-700',
    }
    return colors[type] || colors[FollowType.OTHER]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-20">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 pb-20">
        <div className="text-red-500">加载失败，客户不存在</div>
        <Link to="/customers">
          <Button variant="outline">返回列表</Button>
        </Link>
      </div>
    )
  }

  const followRecords = customer.followRecords || []

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/customers">
            <Button variant="ghost" size="sm" className="gap-2 px-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">客户详情</h1>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* 客户基本信息卡片 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-blue-600 text-2xl font-bold">
                  {customer.name?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 truncate">{customer.name}</h2>
                {customer.companyName && (
                  <p className="text-sm text-gray-500 truncate mt-1">{customer.companyName}</p>
                )}
                {customer.status && (
                  <p className="text-xs text-gray-400 mt-1">
                    {customer.status === 'ACTIVE' ? '活跃客户' : '非活跃客户'}
                  </p>
                )}
              </div>
            </div>

            {/* 联系信息 */}
            <div className="space-y-3">
              {customer.contactPhone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{customer.contactPhone}</span>
                </div>
              )}

              {customer.contactName && (
                <div className="flex items-center gap-3">
                  <Building className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{customer.contactName}</span>
                </div>
              )}

              {customer.email && (
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-700">{customer.email}</span>
                </div>
              )}

              {customer.address && (
                <div className="flex items-start gap-3">
                  <Building className="w-4 h-4 text-gray-400 mt-0.5" />
                  <span className="text-sm text-gray-700 flex-1">{customer.address}</span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">
                  创建于 {new Date(customer.createdAt).toLocaleDateString('zh-CN')}
                </span>
              </div>
            </div>

            {/* 备注 */}
            {customer.remark && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">备注</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{customer.remark}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 跟进记录卡片 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">跟进记录</h3>
              <Dialog open={followDialogOpen} onOpenChange={setFollowDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    添加
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>添加跟进记录</DialogTitle>
                    <DialogDescription>记录客户跟进情况</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">跟进类型</Label>
                      <Select
                        value={String(followType)}
                        onValueChange={(v) => setFollowType(Number(v) as FollowType)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="选择跟进类型" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={String(FollowType.PHONE)}>电话</SelectItem>
                          <SelectItem value={String(FollowType.WECHAT)}>微信</SelectItem>
                          <SelectItem value={String(FollowType.VISIT)}>上门</SelectItem>
                          <SelectItem value={String(FollowType.EMAIL)}>邮件</SelectItem>
                          <SelectItem value={String(FollowType.OTHER)}>其他</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">跟进内容</Label>
                      <Input
                        id="content"
                        placeholder="请输入跟进内容"
                        value={followContent}
                        onChange={(e) => setFollowContent(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setFollowDialogOpen(false)}>
                      取消
                    </Button>
                    <Button onClick={handleSubmitFollow} disabled={createFollowMutation.isPending}>
                      {createFollowMutation.isPending ? '提交中...' : '提交'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {followRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">暂无跟进记录</div>
            ) : (
              <div className="space-y-4">
                {followRecords.map((record: any) => {
                  const Icon = getFollowTypeIcon(record.type)
                  const colorClass = getFollowTypeColor(record.type)

                  return (
                    <div key={record.id} className="flex gap-3">
                      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0', colorClass)}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 pb-3 border-b border-gray-100 last:border-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 text-sm">
                              {record.user?.name || '未知用户'}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {getFollowTypeLabel(record.type)} · {new Date(record.createdAt).toLocaleString('zh-CN')}
                            </p>
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm mt-2">{record.content}</p>
                        {record.nextTime && (
                          <p className="text-xs text-gray-500 mt-2">
                            下次跟进: {new Date(record.nextTime).toLocaleString('zh-CN')}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 底部浮动操作栏 */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-20">
        <div className="flex gap-3">
          {customer.contactPhone && (
            <Button variant="outline" className="flex-1 gap-2" onClick={handleCall}>
              <Phone className="w-4 h-4" />
              拨打电话
            </Button>
          )}
          <Button className="flex-1 gap-2" onClick={() => setFollowDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            添加跟进
          </Button>
        </div>
      </div>
    </div>
  )
}
