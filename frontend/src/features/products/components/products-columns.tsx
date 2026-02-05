import { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTableRowActions } from './data-table-row-actions'
import type { Product } from '../types/product'

export function getProductsColumns(): ColumnDef<Product>[] {
  const { t } = useTranslation()

  // 金额格式化
  function formatAmount(amount: number) {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
    }).format(amount)
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
      header: () => t('product.columns.name'),
      meta: {
        displayName: t('product.columns.name'),
        className: 'w-[180px]',
      },
      cell: ({ row }) => (
        <div className='font-medium'>{row.getValue('name')}</div>
      ),
    },
    {
      accessorKey: 'code',
      header: () => t('product.columns.code'),
      meta: {
        displayName: t('product.columns.code'),
        className: 'w-[120px]',
      },
      cell: ({ row }) => row.getValue('code') || '-',
    },
    {
      accessorKey: 'price',
      header: () => t('product.columns.price'),
      meta: {
        displayName: t('product.columns.price'),
        className: 'w-[110px]',
      },
      cell: ({ row }) => {
        const price = row.getValue('price') as number
        return <div className='font-medium'>{formatAmount(price)}</div>
      },
    },
    {
      accessorKey: 'invoiceLimit',
      header: () => t('product.columns.invoiceLimit'),
      meta: {
        displayName: t('product.columns.invoiceLimit'),
        className: 'w-[110px]',
      },
      cell: ({ row }) => row.getValue('invoiceLimit'),
    },
    {
      accessorKey: 'invoiceCount',
      header: () => t('product.columns.invoiceCount'),
      meta: {
        displayName: t('product.columns.invoiceCount'),
        className: 'w-[120px]',
      },
      cell: ({ row }) => row.getValue('invoiceCount'),
    },
    {
      accessorKey: 'overLimitPrice',
      header: () => t('product.columns.overLimitPrice'),
      meta: {
        displayName: t('product.columns.overLimitPrice'),
        className: 'w-[110px]',
      },
      cell: ({ row }) => {
        const price = row.getValue('overLimitPrice') as number
        return formatAmount(price)
      },
    },
    {
      id: 'actions',
      cell: DataTableRowActions,
      enableHiding: false,
      meta: {
        displayName: t('product.columns.actions'),
        className: 'w-[120px]',
      },
    },
  ]
}

// 保留旧版本兼容性
export const productsColumns: ColumnDef<Product>[] = getProductsColumns()
