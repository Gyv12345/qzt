import { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { DataTableRowActions } from './data-table-row-actions'
import type { Customer } from '../types/customer'

type CustomersColumnsOptions = {
  t: (key: string) => string
  onOpenDetail?: (customer: Customer) => void
}

export function getCustomersColumns({ t, onOpenDetail }: CustomersColumnsOptions): ColumnDef<Customer>[] {

  // 客户等级映射
  const customerLevelMap: Record<number, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    0: { label: t('customer.levels.0'), variant: 'secondary' },
    1: { label: t('customer.levels.1'), variant: 'outline' },
    2: { label: t('customer.levels.2'), variant: 'default' },
    3: { label: t('customer.levels.3'), variant: 'destructive' },
  }

  function CustomerLevelBadge({ level }: { level: number }) {
    const config = customerLevelMap[level] || customerLevelMap[0]
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  return [
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
      header: () => t('customer.columns.name'),
      meta: {
        displayName: t('customer.columns.name'),
        className: 'w-[180px]',
      },
      cell: ({ row }) => {
        return (
          <div className='font-medium'>{row.getValue('name')}</div>
        )
      },
    },
    {
      accessorKey: 'shortName',
      header: () => t('customer.columns.shortName'),
      meta: {
        displayName: t('customer.columns.shortName'),
        className: 'w-[120px]',
      },
      cell: ({ row }) => row.getValue('shortName') || '-',
    },
    {
      accessorKey: 'industry',
      header: () => t('customer.columns.industry'),
      meta: {
        displayName: t('customer.columns.industry'),
      },
      cell: ({ row }) => row.getValue('industry') || '-',
    },
    {
      accessorKey: 'customerLevel',
      header: () => t('customer.columns.customerLevel'),
      meta: {
        displayName: t('customer.columns.customerLevel'),
        className: 'w-[100px]',
      },
      cell: ({ row }) => {
        const level = row.getValue('customerLevel') as number
        return <CustomerLevelBadge level={level} />
      },
    },
    {
      accessorKey: 'followUserName',
      header: () => t('customer.columns.followUserName'),
      meta: {
        displayName: t('customer.columns.followUserName'),
        className: 'w-[100px]',
      },
      cell: ({ row }) => row.getValue('followUserName') || '-',
    },
    {
      accessorKey: 'sourceChannel',
      header: () => t('customer.columns.sourceChannel'),
      meta: {
        displayName: t('customer.columns.sourceChannel'),
      },
      cell: ({ row }) => row.getValue('sourceChannel') || '-',
    },
    {
      accessorKey: 'createdAt',
      header: () => t('customer.columns.createdAt'),
      meta: {
        displayName: t('customer.columns.createdAt'),
        className: 'w-[110px]',
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue('createdAt'))
        return date.toLocaleDateString('zh-CN')
      },
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
      enableHiding: false,
      meta: {
        displayName: t('customer.columns.actions'),
        className: 'w-[120px]',
      },
    },
  ]
}
