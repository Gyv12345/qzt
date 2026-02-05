import { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import type { Contact } from '../types/contact'

export const contactsColumns: ColumnDef<Contact>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
        className='translate-y-[2px]'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
        className='translate-y-[2px]'
      />
    ),
    enableSorting: false,
    enableHiding: false,
    meta: {
      className: 'w-[40px]',
    },
  },
  {
    accessorKey: 'name',
    header: '姓名',
    cell: ({ row }) => {
      const name = row.getValue('name') as string
      const isPrimary = (row.original as any).isPrimary
      const isDecisionMaker = (row.original as any).isDecisionMaker

      return (
        <div className='flex items-center gap-2'>
          <span className='font-medium'>{name}</span>
          {isPrimary && (
            <Badge variant='default' className='text-xs'>主要</Badge>
          )}
          {isDecisionMaker && (
            <Badge variant='destructive' className='text-xs'>决策人</Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: 'phone',
    header: '手机号',
    cell: ({ row }) => {
      const phone = row.getValue('phone') as string
      return (
        <span className='font-mono text-sm'>{phone}</span>
      )
    },
  },
  {
    accessorKey: 'email',
    header: '邮箱',
    cell: ({ row }) => row.getValue('email') || '-',
  },
  {
    accessorKey: 'customerName',
    header: '所属企业',
    cell: ({ row }) => {
      const customerName = row.getValue('customerName') as string
      return customerName || <span className='text-muted-foreground'>未关联</span>
    },
  },
  {
    accessorKey: 'position',
    header: '职位',
    cell: ({ row }) => row.getValue('position') || '-',
  },
  {
    accessorKey: 'department',
    header: '部门',
    cell: ({ row }) => row.getValue('department') || '-',
  },
  {
    accessorKey: 'wechat',
    header: '微信号',
    cell: ({ row }) => row.getValue('wechat') || '-',
    meta: {
      className: 'w-[100px]',
    },
  },
  {
    accessorKey: 'birthdate',
    header: '生日',
    cell: ({ row }) => {
      const birthdate = row.getValue('birthdate') as string
      if (!birthdate) return '-'

      const date = new Date(birthdate)
      const now = new Date()
      const currentYear = now.getFullYear()
      const birthMonth = date.getMonth() + 1
      const birthDay = date.getDate()
      const isBirthdaySoon =
        birthMonth === now.getMonth() + 1 &&
        birthDay >= now.getDate() &&
        birthDay <= now.getDate() + 7

      return (
        <div className='flex items-center gap-2'>
          <span>{date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}</span>
          {isBirthdaySoon && (
            <Badge variant='secondary' className='text-xs'>
              {birthDay === now.getDate() ? '今天生日' : `${birthDay - now.getDate()}天后`}
            </Badge>
          )}
        </div>
      )
    },
    meta: {
      className: 'w-[90px]',
    },
  },
  {
    accessorKey: 'createdAt',
    header: '创建时间',
    cell: ({ row }) => {
      const date = new Date(row.getValue('createdAt'))
      return date.toLocaleDateString('zh-CN')
    },
    meta: {
      className: 'w-[100px]',
    },
  },
  {
    id: 'actions',
    header: '操作',
    meta: {
      className: 'w-[60px]',
    },
  },
]
