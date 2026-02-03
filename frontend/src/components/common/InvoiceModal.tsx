import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { request } from '@umijs/max'
import { useCustomers, useContracts } from '@/services'
import { AlertTriangle } from 'lucide-react'

interface InvoiceModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
  currentInvoice?: any
}

export default function InvoiceModal({
  visible,
  onCancel,
  onSuccess,
  currentInvoice,
}: InvoiceModalProps) {
  const [formData, setFormData] = useState({
    customerId: '',
    contractId: '',
    amount: 0,
    count: 0,
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    remark: '',
  })

  const [validation, setValidation] = useState<{
    warning?: string
    overLimit?: { count: number; amount: number }
  } | null>(null)

  const { data: customers } = useCustomers({ pageSize: 1000 })
  const { data: contracts, refetch: refetchContracts } = useContracts({
    pageSize: 1000,
    customerId: formData.customerId,
  })

  useEffect(() => {
    if (formData.customerId) {
      refetchContracts()
    }
  }, [formData.customerId, refetchContracts])

  useEffect(() => {
    if (visible && currentInvoice) {
      setFormData({
        customerId: currentInvoice.customerId,
        contractId: currentInvoice.contractId || '',
        amount: currentInvoice.amount,
        count: currentInvoice.count,
        month: currentInvoice.month,
        remark: currentInvoice.remark || '',
      })
    } else if (visible) {
      setFormData({
        customerId: '',
        contractId: '',
        amount: 0,
        count: 0,
        month: new Date().toISOString().slice(0, 7),
        remark: '',
      })
    }
    setValidation(null)
  }, [visible, currentInvoice])

  const validateInvoice = async () => {
    if (!formData.customerId || !formData.month) return

    try {
      // 获取客户开票汇总来验证是否超额
      const params = new URLSearchParams()
      params.append('month', formData.month)
      const summary = await request<any>(
        `/invoices/customer/${formData.customerId}/summary?${params.toString()}`
      )

      const remainingCount = summary.invoiceCount - summary.totalCount
      const overLimitCount = Math.max(0, formData.count - remainingCount)
      const overLimitAmount = overLimitCount * summary.overLimitPrice

      if (overLimitCount > 0) {
        setValidation({
          warning: `本次开票将超额 ${overLimitCount} 张，超额费用 ¥${overLimitAmount}`,
          overLimit: { count: overLimitCount, amount: overLimitAmount },
        })
      } else {
        setValidation(null)
      }
    } catch (error) {
      console.error('验证失败', error)
    }
  }

  useEffect(() => {
    if (visible && formData.customerId && formData.month && formData.count > 0) {
      validateInvoice()
    }
  }, [formData.customerId, formData.month, formData.count, visible])

  const handleSubmit = async () => {
    try {
      const payload: any = {
        customerId: formData.customerId,
        amount: Number(formData.amount),
        count: Number(formData.count),
        month: formData.month,
      }

      if (formData.contractId) {
        payload.contractId = formData.contractId
      }

      if (formData.remark) {
        payload.remark = formData.remark
      }

      if (currentInvoice) {
        await request(`/invoices/${currentInvoice.id}`, {
          method: 'PATCH',
          data: payload,
        })
      } else {
        await request('/invoices', {
          method: 'POST',
          data: payload,
        })
      }

      onSuccess()
    } catch (error) {
      console.error('保存失败', error)
    }
  }

  const isFormValid = formData.customerId && formData.amount > 0 && formData.count > 0 && formData.month

  return (
    <Dialog open={visible} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{currentInvoice ? '编辑开票记录' : '新建开票记录'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 超额警告 */}
          {validation?.warning && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <div className="font-semibold text-orange-900">超额预警</div>
                  <div className="text-sm text-orange-700 mt-1">{validation.warning}</div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="customerId">
                客户 <span className="text-red-500">*</span>
              </Label>
              <select
                id="customerId"
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value, contractId: '' })}
                className="w-full border rounded px-3 py-2 mt-1"
                disabled={!!currentInvoice}
              >
                <option value="">请选择客户</option>
                {customers?.data?.map((customer: any) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="contractId">关联合同(可选)</Label>
              <select
                id="contractId"
                value={formData.contractId}
                onChange={(e) => setFormData({ ...formData, contractId: e.target.value })}
                className="w-full border rounded px-3 py-2 mt-1"
                disabled={!formData.customerId}
              >
                <option value="">请选择合同</option>
                {contracts?.data
                  ?.filter((c: any) => c.customerId === formData.customerId)
                  .map((contract: any) => (
                    <option key={contract.id} value={contract.id}>
                      {contract.code} - ¥{contract.amount}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <Label htmlFor="month">
                开票月份 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="month"
                type="month"
                value={formData.month}
                onChange={(e) => setFormData({ ...formData, month: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="amount">
                开票金额 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              />
            </div>

            <div>
              <Label htmlFor="count">
                开票张数 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="count"
                type="number"
                min="1"
                value={formData.count}
                onChange={(e) => setFormData({ ...formData, count: Number(e.target.value) })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="remark">备注</Label>
              <Input
                id="remark"
                value={formData.remark}
                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                placeholder="选填"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={!isFormValid}>
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
