import { useQuery } from '@tanstack/react-query'
import { useParams, Link } from 'react-router-dom'
import { getScrmApi } from '@/services/api'
import { useServiceTeamGrouped } from '@/services'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Phone, Mail, Building, Calendar, Users, UserPlus, Trash2 } from 'lucide-react'
import { FollowRecordTimeline } from '@/components/FollowRecordTimeline'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useUsers } from '@/services'
import { useCreateServiceTeam, useDeleteServiceTeam } from '@/services'

const ROLE_LABELS = {
  SALE: '业务',
  FINANCE: '财务',
  OUTWORK: '外勤',
}

const ROLE_COLORS = {
  SALE: 'bg-blue-100 text-blue-800',
  FINANCE: 'bg-green-100 text-green-800',
  OUTWORK: 'bg-purple-100 text-purple-800',
}

export const CustomerDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<'info' | 'team'>('info')
  const [addTeamModalOpen, setAddTeamModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'SALE' | 'FINANCE' | 'OUTWORK'>('SALE')
  const [selectedUserId, setSelectedUserId] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const api = getScrmApi()
      const response = await api.customerControllerFindOne(id!)
      return response as any
    },
    enabled: !!id,
  })

  const { data: teamGrouped, refetch: refetchTeam } = useServiceTeamGrouped(id!)
  const { data: users } = useUsers({ pageSize: 1000 })

  const createTeamMutation = useCreateServiceTeam()
  const deleteTeamMutation = useDeleteServiceTeam()

  const customer = data?.data

  const handleAddTeamMember = async () => {
    if (!selectedUserId) return

    try {
      await createTeamMutation.mutateAsync({
        customerId: id,
        userId: selectedUserId,
        roleCode: selectedRole,
      })
      setAddTeamModalOpen(false)
      setSelectedUserId('')
      refetchTeam()
    } catch (error) {
      console.error('添加团队成员失败', error)
    }
  }

  const handleRemoveTeamMember = async (memberId: string) => {
    if (!confirm('确定要删除这个团队成员吗?')) return

    try {
      await deleteTeamMutation.mutateAsync(memberId)
      refetchTeam()
    } catch (error) {
      console.error('删除团队成员失败', error)
    }
  }

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

  const teamData = teamGrouped || { SALE: [], FINANCE: [], OUTWORK: [] }

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

      {/* 标签页导航 */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('info')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'info'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          基本信息
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'team'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          服务团队
        </button>
      </div>

      {activeTab === 'info' && (
        <>
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
                    {customer.status === 1 ? '活跃客户' : '非活跃客户'}
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
                    <div className="text-sm font-medium">{customer.contactPhone}</div>
                  </div>
                </div>

                {customer.contactEmail && (
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">邮箱</div>
                      <div className="text-sm font-medium">{customer.contactEmail}</div>
                    </div>
                  </div>
                )}

                {customer.companyName && (
                  <div className="flex items-start gap-3">
                    <Building className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">公司</div>
                      <div className="text-sm font-medium">{customer.companyName}</div>
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
        </>
      )}

      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">服务团队</h2>
              <p className="text-sm text-gray-500 mt-1">管理该客户的服务团队成员</p>
            </div>
            <Button onClick={() => setAddTeamModalOpen(true)} className="gap-2">
              <UserPlus className="w-4 h-4" />
              添加成员
            </Button>
          </div>

          {/* 按角色分组的团队成员 */}
          {Object.entries(teamData).map(([role, members]) => (
            <Card key={role}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  {ROLE_LABELS[role as keyof typeof ROLE_LABELS]}
                  <Badge variant="outline" className="ml-2">
                    {members.length}人
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {members.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    暂无{ROLE_LABELS[role as keyof typeof ROLE_LABELS]}成员
                  </div>
                ) : (
                  <div className="space-y-3">
                    {members.map((member: any) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <Users className="w-5 h-5 text-gray-500" />
                          </div>
                          <div>
                            <div className="font-medium">{member.user?.name}</div>
                            <div className="text-sm text-gray-500">
                              {member.user?.username} · {member.user?.phone || '无电话'}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTeamMember(member.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 添加团队成员弹窗 */}
      <Dialog open={addTeamModalOpen} onOpenChange={setAddTeamModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>添加服务团队成员</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="role">角色</Label>
              <select
                id="role"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as any)}
                className="w-full border rounded px-3 py-2 mt-1"
              >
                <option value="SALE">业务</option>
                <option value="FINANCE">财务</option>
                <option value="OUTWORK">外勤</option>
              </select>
            </div>

            <div>
              <Label htmlFor="user">成员</Label>
              <select
                id="user"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border rounded px-3 py-2 mt-1"
              >
                <option value="">请选择成员</option>
                {users?.data?.map((user: any) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.username})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAddTeamModalOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddTeamMember} disabled={!selectedUserId}>
                添加
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
