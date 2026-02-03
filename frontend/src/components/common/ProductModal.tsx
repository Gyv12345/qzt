import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Product, CreateProductRequest } from '@/types'

interface ProductModalProps {
  visible: boolean
  onCancel: () => void
  onSuccess: () => void
  currentProduct?: Product | null
}

export default function ProductModal({
  visible,
  onCancel,
  onSuccess,
  currentProduct,
}: ProductModalProps) {
  const [formData, setFormData] = useState<CreateProductRequest>({
    name: '',
    code: '',
    description: '',
    price: 0,
    invoiceLimit: 0,
    invoiceCount: 0,
    overLimitPrice: 0,
  })

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (visible && currentProduct) {
      setFormData({
        name: currentProduct.name,
        code: currentProduct.code,
        description: currentProduct.description || '',
        price: currentProduct.price,
        invoiceLimit: currentProduct.invoiceLimit,
        invoiceCount: currentProduct.invoiceCount,
        overLimitPrice: currentProduct.overLimitPrice,
      })
    } else if (visible) {
      setFormData({
        name: '',
        code: '',
        description: '',
        price: 0,
        invoiceLimit: 0,
        invoiceCount: 0,
        overLimitPrice: 0,
      })
    }
  }, [visible, currentProduct])

  const handleSubmit = async () => {
    // 验证
    if (!formData.name.trim()) {
      alert('请输入产品名称')
      return
    }
    if (!formData.code.trim()) {
      alert('请输入产品代码')
      return
    }
    if (formData.price <= 0) {
      alert('请输入有效的价格')
      return
    }

    setIsSubmitting(true)
    try {
      // TODO: 调用 API 创建或更新产品
      // if (currentProduct) {
      //   await updateProduct(currentProduct.id, formData)
      // } else {
      //   await createProduct(formData)
      // }
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
          <DialogTitle>{currentProduct ? '编辑产品' : '新建产品'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">产品名称 <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入产品名称"
            />
          </div>

          <div>
            <Label htmlFor="code">产品代码 <span className="text-red-500">*</span></Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              placeholder="例如: FIN_BASE_001"
            />
          </div>

          <div>
            <Label htmlFor="description">产品描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="请输入产品描述"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">价格(元) <span className="text-red-500">*</span></Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={formData.price || ''}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="invoiceLimit">开票额度(元/月) <span className="text-red-500">*</span></Label>
              <Input
                id="invoiceLimit"
                type="number"
                min="0"
                step="0.01"
                value={formData.invoiceLimit || ''}
                onChange={(e) => setFormData({ ...formData, invoiceLimit: Number(e.target.value) })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label htmlFor="invoiceCount">包含张数(张/月) <span className="text-red-500">*</span></Label>
              <Input
                id="invoiceCount"
                type="number"
                min="0"
                value={formData.invoiceCount || ''}
                onChange={(e) => setFormData({ ...formData, invoiceCount: Number(e.target.value) })}
                placeholder="0"
              />
            </div>

            <div>
              <Label htmlFor="overLimitPrice">超额单价(元) <span className="text-red-500">*</span></Label>
              <Input
                id="overLimitPrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.overLimitPrice || ''}
                onChange={(e) => setFormData({ ...formData, overLimitPrice: Number(e.target.value) })}
                placeholder="0.00"
              />
            </div>
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
