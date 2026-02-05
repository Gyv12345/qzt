import { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableRowActions } from './data-table-row-actions'
import type { Product } from '../types/product'

// 金额格式化
function formatAmount(amount: number) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(amount)
}

export const productsColumns: ColumnDef<Product>[] = [
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
    header: '产品名称',
    cell: ({ row }) => (
      <div className='font-medium'>{row.getValue('name')}</div>
    ),
  },
  {
    accessorKey: 'code',
    header: '产品代码',
    cell: ({ row }) => row.getValue('code') || '-',
  },
  {
    accessorKey: 'price',
    header: '价格',
    cell: ({ row }) => {
      const price = row.getValue('price') as number
      return <div className='font-medium'>{formatAmount(price)}</div>
    },
  },
  {
    accessorKey: 'invoiceLimit',
    header: '开票额度/月',
    cell: ({ row }) => row.getValue('invoiceLimit'),
  },
  {
    accessorKey: 'invoiceCount',
    header: '套餐开票张数',
    cell: ({ row }) => row.getValue('invoiceCount'),
  },
  {
    accessorKey: 'overLimitPrice',
    header: '超额单价',
    cell: ({ row }) => {
      const price = row.getValue('overLimitPrice') as number
      return formatAmount(price)
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
