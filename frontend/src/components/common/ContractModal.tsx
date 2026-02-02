import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Contract, CreateContractRequest } from '@/types'

interface ContractModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
  currentContract?: Contract | null
}

export default function ContractModal({
  visible,
  onCancel,
  onSuccess,
  currentContract,
}: ContractModalProps) {
  const [formData, setFormData] = useState<CreateContractRequest>({
    customerId: '',
    productId: '',
    amount: 0,
    serviceStart: '',
    serviceEnd: '',
    remark: '',
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (visible && currentContract) {
      setFormData({
        customerId: currentContract.customerId,
        productId: currentContract.productId,
        amount: currentContract.amount,
        serviceStart: currentContract.serviceStart.split('T')[0],
        serviceEnd: currentContract.serviceEnd.split('T')[0],
        remark: currentContract.remark || '',
      })
    } else if (visible) {
      setFormData({
        customerId: '',
        productId: '',
        amount: 0,
        serviceStart: '',
        serviceEnd: '',
        remark: '',
      })
    }
  }, [visible, currentContract])

  const handleSubmit = async () => {
    // 验证
    if (!formData.customerId) {
      alert('请选择客户')
      return
    }
    if (!formData.productId) {
      alert('请选择产品')
      return
    }
    if (formData.amount <= 0) {
      alert('请输入有效的合同金额')
      return
    }
    if (!formData.serviceStart || !formData.serviceEnd) {
      alert('请选择服务周期')
      return
    }

    setIsSubmitting(true)
    try {
      // TODO: 调用 API 创建或更新合同
      onSuccess()
    } catch (error) {
      console.error('保存失败', error)
      alert('保存失败,请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={visible} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{currentContract ? '编辑合同' : '新建合同'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="customerId">客户 <span className="text-red-500">*</span></Label>
            <Input
              id="customerId"
              value={formData.customerId}
              onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
              placeholder="选择客户"
              disabled
            />
            <p className="text-xs text-muted-foreground mt-1">TODO: 实现客户选择器</p>
          </div>

          <div>
            <Label htmlFor="productId">产品 <span className="text-red-500">*</span></Label>
            <Input
              id="productId"
              value={formData.productId}
              onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
              placeholder="选择产品"
              disabled
            />
            <p className="text-xs text-muted-foreground mt-1">TODO: 实现产品选择器</p>
          </div>

          <div>
            <Label htmlFor="amount">合同金额(元) <span className="text-red-500">*</span></Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="serviceStart">服务开始日期 <span className="text-red-500">*</span></Label>
              <Input
                id="serviceStart"
                type="date"
                value={formData.serviceStart}
                onChange={(e) => setFormData({ ...formData, serviceStart: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="serviceEnd">服务结束日期 <span className="text-red-500">*</span></Label>
              <Input
                id="serviceEnd"
                type="date"
                value={formData.serviceEnd}
                onChange={(e) => setFormData({ ...formData, serviceEnd: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="remark">备注</Label>
            <Textarea
              id="remark"
              value={formData.remark}
              onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
              placeholder="请输入备注"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
