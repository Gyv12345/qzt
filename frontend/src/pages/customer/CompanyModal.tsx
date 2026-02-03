import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'
import type { CreateCustomerDto, UpdateCustomerDto } from '@/models'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Company {
  id: string
  name: string
  shortName?: string
  code?: string
  industry?: string
  scale?: string
  address?: string
  website?: string
  customerLevel: number
  sourceChannel?: string
  tags?: string
  remark?: string
}

interface CompanyModalProps {
  open: boolean
  onClose: () => void
  company?: Company | null
  onSuccess: () => void
}

const industries = [
  '互联网/IT', '金融', '制造业', '房地产', '建筑/工程',
  '零售/批发', '餐饮', '物流/运输', '教育/培训', '医疗/健康',
  '文化传媒', '能源/环保', '化工', '农业', '其他'
]

const scales = [
  '1-10人', '11-50人', '51-200人', '201-500人', '500人以上'
]

const customerLevels = [
  { value: 0, label: '线索公司' },
  { value: 1, label: '意向客户' },
  { value: 2, label: '正式客户' },
  { value: 3, label: 'VIP客户' },
]

export const CompanyModal = ({ open, onClose, company, onSuccess }: CompanyModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    shortName: '',
    code: '',
    industry: '',
    scale: '',
    address: '',
    website: '',
    customerLevel: 0,
    sourceChannel: '',
    tags: '',
    remark: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || '',
        shortName: company.shortName || '',
        code: company.code || '',
        industry: company.industry || '',
        scale: company.scale || '',
        address: company.address || '',
        website: company.website || '',
        customerLevel: company.customerLevel ?? 0,
        sourceChannel: company.sourceChannel || '',
        tags: company.tags || '',
        remark: company.remark || '',
      })
    } else {
      setFormData({
        name: '',
        shortName: '',
        code: '',
        industry: '',
        scale: '',
        address: '',
        website: '',
        customerLevel: 0,
        sourceChannel: '',
        tags: '',
        remark: '',
      })
    }
    setErrors({})
  }, [company, open])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '请输入公司名称'
    }

    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = '请输入正确的网址格式（如：https://example.com）'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const createMutation = useMutation({
    mutationFn: async (data: CreateCustomerDto) => {
      const api = getScrmApi()
      await api.customerControllerCreate(data)
    },
    onSuccess: () => {
      onSuccess()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCustomerDto }) => {
      const api = getScrmApi()
      await api.customerControllerUpdate(id, data)
    },
    onSuccess: () => {
      onSuccess()
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    const submitData = {
      name: formData.name.trim(),
      shortName: formData.shortName.trim() || undefined,
      code: formData.code.trim() || undefined,
      industry: formData.industry || undefined,
      scale: formData.scale || undefined,
      address: formData.address.trim() || undefined,
      website: formData.website.trim() || undefined,
      customerLevel: formData.customerLevel,
      sourceChannel: formData.sourceChannel.trim() || undefined,
      tags: formData.tags.trim() || undefined,
      remark: formData.remark.trim() || undefined,
    }

    if (company) {
      updateMutation.mutate({ id: company.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{company ? '编辑公司' : '新建公司'}</DialogTitle>
          <DialogDescription>
            {company ? '修改公司信息' : '填写公司基本信息'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* 基本信息 */}
            <div className="grid gap-4">
              <h3 className="text-sm font-medium text-gray-900">基本信息</h3>
              <div className="grid gap-2">
                <Label htmlFor="name">
                  公司名称 <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="请输入公司全称"
                  disabled={isPending}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="shortName">公司简称</Label>
                  <Input
                    id="shortName"
                    value={formData.shortName}
                    onChange={(e) => setFormData({ ...formData, shortName: e.target.value })}
                    placeholder="简称"
                    disabled={isPending}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="code">公司编码</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="外部系统对接用"
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="industry">行业</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => setFormData({ ...formData, industry: value })}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择行业" />
                    </SelectTrigger>
                    <SelectContent>
                      {industries.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="scale">公司规模</Label>
                  <Select
                    value={formData.scale}
                    onValueChange={(value) => setFormData({ ...formData, scale: value })}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择规模" />
                    </SelectTrigger>
                    <SelectContent>
                      {scales.map((scale) => (
                        <SelectItem key={scale} value={scale}>
                          {scale}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="address">公司地址</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="请输入公司地址"
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="website">公司网站</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                  disabled={isPending}
                />
                {errors.website && <p className="text-sm text-red-500">{errors.website}</p>}
              </div>
            </div>

            {/* 客户信息 */}
            <div className="grid gap-4 pt-4 border-t">
              <h3 className="text-sm font-medium text-gray-900">客户信息</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="customerLevel">客户等级</Label>
                  <Select
                    value={String(formData.customerLevel)}
                    onValueChange={(value) => setFormData({ ...formData, customerLevel: Number(value) })}
                    disabled={isPending}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {customerLevels.map((level) => (
                        <SelectItem key={level.value} value={String(level.value)}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="sourceChannel">来源渠道</Label>
                  <Input
                    id="sourceChannel"
                    value={formData.sourceChannel}
                    onChange={(e) => setFormData({ ...formData, sourceChannel: e.target.value })}
                    placeholder="如：推荐、广告等"
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tags">标签</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="多个标签用逗号分隔"
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="remark">备注</Label>
                <Textarea
                  id="remark"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                  placeholder="请输入备注信息"
                  rows={3}
                  disabled={isPending}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中...' : company ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
