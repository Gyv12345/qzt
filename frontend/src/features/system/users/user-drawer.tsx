import { useState, useEffect } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { getScrmApi } from '@/services/api'
import type { User, CreateUserInput, UpdateUserInput } from './types'

interface UserDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
  onSuccess?: () => void
}

export function UserDrawer({ open, onOpenChange, userId, onSuccess }: UserDrawerProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<CreateUserInput>({
    username: '',
    password: '',
    name: '',
    email: '',
    phone: '',
    departmentId: '',
    roleIds: [],
    status: 1,
  })
  const [departments, setDepartments] = useState<any[]>([])
  const [roles, setRoles] = useState<any[]>([])

  const isEdit = !!userId

  useEffect(() => {
    // 加载部门和角色列表
    const loadOptions = async () => {
      try {
        const api = getScrmApi()
        // TODO: 调用部门和角色 API
        // const [deptResp, roleResp] = await Promise.all([
        //   api.departmentControllerFindTree(),
        //   api.roleControllerFindAll(),
        // ])
        // setDepartments(deptResp.data || [])
        // setRoles(roleResp.data || [])
      } catch (error) {
        console.error('加载选项失败:', error)
      }
    }
    loadOptions()
  }, [])

  useEffect(() => {
    if (userId) {
      // 加载用户详情
      const loadUser = async () => {
        try {
          setLoading(true)
          const api = getScrmApi()
          // TODO: 调用用户详情 API
          // const resp = await api.userControllerFindOne({ id: userId })
          // setFormData({
          //   username: resp.username,
          //   name: resp.name,
          //   email: resp.email || '',
          //   phone: resp.phone || '',
          //   departmentId: resp.departmentId || '',
          //   roleIds: resp.roles?.map(r => r.role.id) || [],
          //   status: resp.status,
          // })
        } catch (error) {
          console.error('加载用户失败:', error)
        } finally {
          setLoading(false)
        }
      }
      loadUser()
    }
  }, [userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const api = getScrmApi()
      if (isEdit) {
        // TODO: 调用更新 API
        // await api.userControllerUpdate({ id: userId, ...formData })
      } else {
        // TODO: 调用创建 API
        // await api.userControllerCreate(formData)
      }
      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{isEdit ? '编辑用户' : '新增用户'}</DrawerTitle>
        </DrawerHeader>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
              disabled={isEdit}
            />
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">姓名</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">手机号</Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">部门</Label>
            <Select
              value={formData.departmentId}
              onValueChange={(value) => setFormData({ ...formData, departmentId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择部门" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">状态</Label>
            <div className="flex items-center space-x-2">
              <Switch
                id="status"
                checked={formData.status === 1}
                onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 1 : 0 })}
              />
              <Label htmlFor="status">启用</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? '保存中...' : '保存'}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
