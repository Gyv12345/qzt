import { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { DataTableRowActions } from './data-table-row-actions'
import type { Customer } from '../types/customer'

// 客户等级映射
const customerLevelMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  0: { label: '线索', variant: 'secondary' },
  1: { label: '意向', variant: 'outline' },
  2: { label: '正式', variant: 'default' },
  3: { label: 'VIP', variant: 'destructive' },
}

function CustomerLevelBadge({ level }: { level: number }) {
  const config = customerLevelMap[level] || customerLevelMap[0]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export const customersColumns: ColumnDef<Customer>[] = [
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
    header: '公司名称',
    cell: ({ row }) => {
      return (
        <div className='font-medium'>{row.getValue('name')}</div>
      )
    },
  },
  {
    accessorKey: 'shortName',
    header: '简称',
    cell: ({ row }) => row.getValue('shortName') || '-',
  },
  {
    accessorKey: 'industry',
    header: '行业',
    cell: ({ row }) => row.getValue('industry') || '-',
  },
  {
    accessorKey: 'customerLevel',
    header: '客户等级',
    cell: ({ row }) => {
      const level = row.getValue('customerLevel') as number
      return <CustomerLevelBadge level={level} />
    },
  },
  {
    accessorKey: 'followUserName',
    header: '跟进人',
    cell: ({ row }) => row.getValue('followUserName') || '-',
  },
  {
    accessorKey: 'sourceChannel',
    header: '来源渠道',
    cell: ({ row }) => row.getValue('sourceChannel') || '-',
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
    cell: DataTableRowActions,
    meta: {
      className: 'w-[60px]',
    },
  },
]
