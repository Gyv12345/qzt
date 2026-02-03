import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { DataTable } from '@/components/data-table/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowUpDown, MoreHorizontal, Search } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserDrawer } from '@/features/system/users/user-drawer'
import type { User } from '@/features/system/users/types'
import { z } from 'zod'

const userSearchSchema = z.object({
  page: z.number().optional(),
  pageSize: z.number().optional(),
  search: z.string().optional(),
})

export const Route = createFileRoute('/_authenticated/system/users')({
  validateSearch: (search) => userSearchSchema.parse(search),
  component: UserListPage,
})

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'username',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          用户名
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: 'name',
    header: '姓名',
  },
  {
    accessorKey: 'email',
    header: '邮箱',
    cell: ({ row }) => row.getValue('email') || '-',
  },
  {
    accessorKey: 'phone',
    header: '手机号',
    cell: ({ row }) => row.getValue('phone') || '-',
  },
  {
    accessorKey: 'department',
    header: '部门',
    cell: ({ row }) => row.original.department?.name || '-',
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      const status = row.getValue('status')
      return (
        <span className={`px-2 py-1 rounded-full text-xs ${
          status === 1
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
        }`}>
          {status === 1 ? '启用' : '禁用'}
        </span>
      )
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const user = row.original

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">打开菜单</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>操作</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => console.log('编辑', user.id)}>
              编辑
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => console.log('重置密码', user.id)}>
              重置密码
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => console.log('删除', user.id)} className="text-red-600">
              删除
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

function UserListPage() {
  const search = Route.useSearch()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>()
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState(search.search || '')

  // 加载用户列表
  const loadUsers = async () => {
    setLoading(true)
    try {
      const api = getScrmApi()
      // TODO: 调用用户列表 API
      // const resp = await api.userControllerFindAll({
      //   page: search.page || 1,
      //   pageSize: search.pageSize || 10,
      //   search: searchKeyword,
      // })
      // setUsers(resp.data || [])
      // setTotal(resp.total || 0)
    } catch (error) {
      console.error('加载用户列表失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 模拟数据
  const mockData: User[] = [
    {
      id: '1',
      username: 'admin',
      name: '管理员',
      email: 'admin@example.com',
      phone: '13800138000',
      status: 1,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    },
  ]

  const handleCreate = () => {
    setEditingId(undefined)
    setDrawerOpen(true)
  }

  const handleEdit = (id: string) => {
    setEditingId(id)
    setDrawerOpen(true)
  }

  const handleSearch = () => {
    // 更新搜索参数并重新加载
    console.log('搜索:', searchKeyword)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除此用户吗？')) return
    try {
      const api = getScrmApi()
      // TODO: 调用删除 API
      // await api.userControllerRemove({ id })
      loadUsers()
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  const handleResetPassword = async (id: string) => {
    const newPassword = prompt('请输入新密码:')
    if (!newPassword) return
    try {
      const api = getScrmApi()
      // TODO: 调用重置密码 API
      // await api.userControllerResetPassword({ id, newPassword: { newPassword } })
      alert('密码重置成功')
    } catch (error) {
      console.error('重置密码失败:', error)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">用户管理</h1>
          <p className="text-sm text-gray-500">管理系统用户和权限</p>
        </div>
        <Button onClick={handleCreate}>新增用户</Button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="搜索用户名、姓名、邮箱..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button onClick={handleSearch}>搜索</Button>
      </div>

      <DataTable
        columns={columns}
        data={mockData}
        total={mockData.length}
        pageSize={search.pageSize || 10}
        loading={loading}
      />

      <UserDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        userId={editingId}
        onSuccess={loadUsers}
      />
    </div>
  )
}
