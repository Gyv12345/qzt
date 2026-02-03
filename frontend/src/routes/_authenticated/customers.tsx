import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { DataTable } from '@/components/data-table/data-table'
import { type ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { ArrowUpDown, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { customerSearchSchema } from '@/features/customer/schemas/customer-schema'
import { CustomerDrawer } from '@/features/customer/components/customer-drawer'
import type { Customer } from '@/features/customer/types'

export const Route = createFileRoute('/_authenticated/customers')({
  validateSearch: (search) => customerSearchSchema.parse(search),
  component: CustomerListPage,
})

const columns: ColumnDef<Customer>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          公司名称
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
  },
  {
    accessorKey: 'customerLevel',
    header: '客户等级',
    cell: ({ row }) => {
      const level = row.getValue('customerLevel')
      return <div>{level === 'VIP' ? 'VIP' : '普通'}</div>
    },
  },
  {
    accessorKey: 'contact',
    header: '联系人',
  },
  {
    accessorKey: 'phone',
    header: '联系电话',
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const customer = row.original

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
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(customer.id)}
            >
              复制 ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>查看详情</DropdownMenuItem>
            <DropdownMenuItem>编辑</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

function CustomerListPage() {
  const search = Route.useSearch()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | undefined>()

  const mockData: Customer[] = [
    {
      id: '1',
      name: '示例公司',
      customerLevel: 'VIP',
      contact: '张三',
      phone: '13800138000',
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">客户管理</h1>
        <Button onClick={handleCreate}>新增客户</Button>
      </div>

      <DataTable
        columns={columns}
        data={mockData}
        total={1}
        pageSize={search.pageSize}
      />

      <CustomerDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        customerId={editingId}
      />
    </div>
  )
}
