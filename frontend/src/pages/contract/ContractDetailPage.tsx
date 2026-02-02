import { useParams } from 'react-router-dom'
import { useContract, useContractPayments } from '@/services'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: contract, isLoading, error } = useContract(id!)
  const { data: paymentsData, refetch: refetchPayments } = useContractPayments(id!)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-lg text-muted-foreground">加载中...</div>
        </div>
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-red-500">
          <div className="text-lg">合同不存在</div>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/contracts')}
          >
            返回列表
          </Button>
        </div>
      </div>
    )
  }

  const statusMap = {
    0: { text: '待收款', color: 'destructive' as const },
    1: { text: '部分收款', color: 'default' as const },
    2: { text: '已收全', color: 'default' as const },
  }
  const status = statusMap[contract.status] || statusMap[0]

  // 收款进度
  const progress = contract.amount > 0 ? (contract.paidAmount / contract.amount) * 100 : 0

  const payments = paymentsData?.payments || []
  const totalPaid = paymentsData?.totalPaid || 0

  return (
    <div className="space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/contracts')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{contract.contractNo}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {contract.customer?.name || '未知客户'}
          </p>
        </div>
        <Button>编辑合同</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* 左侧:合同信息 */}
        <div className="md:col-span-1 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">合同信息</h2>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">合同编号</span>
                <p className="font-mono text-sm mt-1">{contract.contractNo}</p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">客户名称</span>
                <p className="font-medium mt-1">{contract.customer?.name || '-'}</p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">产品名称</span>
                <p className="font-medium mt-1">{contract.product?.name || '-'}</p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">合同金额</span>
                <p className="text-2xl font-bold text-primary mt-1">
                  ¥{contract.amount.toLocaleString()}
                </p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">已收金额</span>
                <p className="text-lg font-semibold text-green-600 mt-1">
                  ¥{contract.paidAmount.toLocaleString()}
                </p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">收款进度</span>
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">状态</span>
                <div className="mt-1">
                  <Badge variant={status.color}>{status.text}</Badge>
                </div>
              </div>

              <div className="pt-4 border-t">
                <span className="text-sm text-muted-foreground">服务周期</span>
                <p className="text-sm mt-2">
                  {format(new Date(contract.serviceStart), 'yyyy年MM月dd日')} ~{' '}
                  {format(new Date(contract.serviceEnd), 'yyyy年MM月dd日')}
                </p>
              </div>

              {contract.remark && (
                <div className="pt-4 border-t">
                  <span className="text-sm text-muted-foreground">备注</span>
                  <p className="text-sm mt-2">{contract.remark}</p>
                </div>
              )}

              <div className="pt-4 border-t text-xs text-muted-foreground">
                <div>创建时间: {format(new Date(contract.createdAt), 'yyyy-MM-dd HH:mm')}</div>
                <div>更新时间: {format(new Date(contract.updatedAt), 'yyyy-MM-dd HH:mm')}</div>
              </div>
            </div>
          </Card>
        </div>

        {/* 右侧:收款记录 */}
        <div className="md:col-span-2">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">收款记录</h2>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                添加收款
              </Button>
            </div>

            <div className="space-y-4">
              {payments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  暂无收款记录
                </div>
              ) : (
                payments.map((payment: any) => (
                  <div
                    key={payment.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-lg">
                            ¥{payment.amount.toLocaleString()}
                          </span>
                          <Badge variant={payment.status === 1 ? 'default' : 'secondary'}>
                            {payment.status === 1 ? '已确认' : '待确认'}
                          </Badge>
                        </div>

                        <div className="text-sm space-y-1">
                          <div>
                            <span className="text-muted-foreground">收款方式: </span>
                            {payment.method === 1 && '银行转账'}
                            {payment.method === 2 && '微信'}
                            {payment.method === 3 && '支付宝'}
                            {payment.method === 4 && '现金'}
                          </div>
                          {payment.payTime && (
                            <div>
                              <span className="text-muted-foreground">付款时间: </span>
                              {format(new Date(payment.payTime), 'yyyy-MM-dd HH:mm')}
                            </div>
                          )}
                          {payment.voucherUrl && (
                            <div>
                              <span className="text-muted-foreground">凭证: </span>
                              <a
                                href={payment.voucherUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                查看凭证
                              </a>
                            </div>
                          )}
                          {payment.remark && (
                            <div>
                              <span className="text-muted-foreground">备注: </span>
                              {payment.remark}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            创建于 {format(new Date(payment.createdAt), 'yyyy-MM-dd HH:mm')}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {payment.status === 0 && (
                          <Button variant="outline" size="sm">
                            确认
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          编辑
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {payments.length > 0 && (
              <div className="pt-4 border-t mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">收款统计</span>
                  <span className="font-medium">
                    已确认 {paymentsData?.confirmedCount || 0}/{payments.length} 笔,
                    共 ¥{totalPaid.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
