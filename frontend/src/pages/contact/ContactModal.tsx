import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { getScrmApi } from '@/services/api'
import type { CreateContactDto, UpdateContactDto } from '@/models'
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
}

interface ContactModalProps {
  open: boolean
  onClose: () => void
  contact?: Contact | null
  onSuccess: () => void
}

export const ContactModal = ({ open, onClose, contact, onSuccess }: ContactModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    wechat: '',
    position: '',
    department: '',
    birthdate: '',
    tags: '',
    remark: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        phone: contact.phone || '',
        email: contact.email || '',
        wechat: contact.wechat || '',
        position: contact.position || '',
        department: contact.department || '',
        birthdate: contact.birthdate ? contact.birthdate.split('T')[0] : '',
        tags: contact.tags || '',
        remark: contact.remark || '',
      })
    } else {
      setFormData({
        name: '',
        phone: '',
        email: '',
        wechat: '',
        position: '',
        department: '',
        birthdate: '',
        tags: '',
        remark: '',
      })
    }
    setErrors({})
  }, [contact, open])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = '请输入联系人姓名'
    }
    if (!formData.phone.trim()) {
      newErrors.phone = '请输入联系电话'
    } else if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = '请输入正确的手机号'
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入正确的邮箱地址'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const createMutation = useMutation({
    mutationFn: async (data: CreateContactDto) => {
      const api = getScrmApi()
      await api.contactControllerCreate(data)
    },
    onSuccess: () => {
      onSuccess()
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateContactDto }) => {
      const api = getScrmApi()
      await api.contactControllerUpdate(id, data)
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
      phone: formData.phone.trim(),
      email: formData.email.trim() || undefined,
      wechat: formData.wechat.trim() || undefined,
      position: formData.position.trim() || undefined,
      department: formData.department.trim() || undefined,
      birthdate: formData.birthdate || undefined,
      tags: formData.tags.trim() || undefined,
      remark: formData.remark.trim() || undefined,
    }

    if (contact) {
      updateMutation.mutate({ id: contact.id, data: submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{contact ? '编辑联系人' : '新建联系人'}</DialogTitle>
          <DialogDescription>
            {contact ? '修改联系人信息' : '填写联系人信息'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">
                姓名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="请输入联系人姓名"
                disabled={isPending}
              />
              {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone">
                手机号 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="请输入手机号"
                disabled={isPending}
              />
              {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="请输入邮箱地址"
                disabled={isPending}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="wechat">微信号</Label>
                <Input
                  id="wechat"
                  value={formData.wechat}
                  onChange={(e) => setFormData({ ...formData, wechat: e.target.value })}
                  placeholder="微信号"
                  disabled={isPending}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="position">职位</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="如：采购经理"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="department">部门</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="如：采购部"
                disabled={isPending}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="birthdate">生日</Label>
              <Input
                id="birthdate"
                type="date"
                value={formData.birthdate}
                onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                disabled={isPending}
              />
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              取消
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? '保存中...' : contact ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
