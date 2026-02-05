import { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { DataTableRowActions } from './data-table-row-actions'
import type { Contract } from '../types/contract'

export function getContractsColumns(): ColumnDef<Contract>[] {
  const { t } = useTranslation()

  // 金额格式化
  function formatAmount(amount: number) {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount)
  }

  // 日期格式化
  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('zh-CN')
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
      accessorKey: 'customerName',
      header: () => t('contract.columns.customerName'),
      meta: {
        displayName: t('contract.columns.customerName'),
        className: 'w-[180px]',
      },
      cell: ({ row }) => {
        return (
          <div className='font-medium'>{row.getValue('customerName') || '-'}</div>
        )
      },
    },
    {
      accessorKey: 'productName',
      header: '产品名称',
      meta: {
        displayName: '产品名称',
      },
      cell: ({ row }) => row.getValue('productName') || '-',
    },
    {
      accessorKey: 'amount',
      header: () => t('contract.columns.amount'),
      meta: {
        displayName: t('contract.columns.amount'),
        className: 'w-[120px]',
      },
      cell: ({ row }) => {
        const amount = row.getValue('amount') as number
        return <div className='font-medium'>{formatAmount(amount)}</div>
      },
    },
    {
      accessorKey: 'serviceStart',
      header: '服务开始日期',
      meta: {
        displayName: '服务开始日期',
        className: 'w-[110px]',
      },
      cell: ({ row }) => formatDate(row.getValue('serviceStart')),
    },
    {
      accessorKey: 'serviceEnd',
      header: '服务结束日期',
      meta: {
        displayName: '服务结束日期',
        className: 'w-[110px]',
      },
      cell: ({ row }) => formatDate(row.getValue('serviceEnd')),
    },
    {
      accessorKey: 'paymentStatus',
      header: '收款状态',
      meta: {
        displayName: '收款状态',
        className: 'w-[100px]',
      },
      cell: ({ row }) => {
        const status = row.getValue('paymentStatus') as string
        const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
          unpaid: { label: '未收款', variant: 'secondary' },
          partial: { label: '部分收款', variant: 'outline' },
          paid: { label: '已收款', variant: 'default' },
        }
        const config = statusMap[status] || statusMap.unpaid
        return <Badge variant={config.variant}>{config.label}</Badge>
      },
    },
    {
      accessorKey: 'createdAt',
      header: () => t('contract.columns.createdAt'),
      meta: {
        displayName: t('contract.columns.createdAt'),
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
        displayName: t('contract.columns.actions'),
        className: 'w-[120px]',
      },
    },
  ]
}
