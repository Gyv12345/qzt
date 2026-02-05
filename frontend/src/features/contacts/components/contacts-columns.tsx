import { ColumnDef } from '@tanstack/react-table'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import type { Contact } from '../types/contact'

type ContactsColumnsOptions = {
  onOpenDetail: (contact: Contact) => void
}

export function getContactsColumns({
  onOpenDetail,
}: ContactsColumnsOptions): ColumnDef<Contact>[] {
  const { t } = useTranslation()

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
      header: () => t('contact.columns.name'),
      meta: {
        displayName: t('contact.columns.name'),
        className: 'w-[140px]',
      },
      cell: ({ row }) => {
        const name = row.getValue('name') as string
        const isPrimary = (row.original as any).isPrimary
        const isDecisionMaker = (row.original as any).isDecisionMaker

        return (
          <div className='flex items-center gap-2'>
            <Button
              variant='link'
              className='h-auto p-0 text-start font-medium'
              onClick={() => onOpenDetail(row.original)}
            >
              {name}
            </Button>
            {isPrimary && (
              <Badge variant='default' className='text-xs'>
                {t('contact.tags.primary')}
              </Badge>
            )}
            {isDecisionMaker && (
              <Badge variant='destructive' className='text-xs'>
                {t('contact.tags.decisionMaker')}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'phone',
      header: () => t('contact.columns.phone'),
      meta: {
        displayName: t('contact.columns.phone'),
      },
      cell: ({ row }) => {
        const phone = row.getValue('phone') as string
        return <span className='font-mono text-sm'>{phone}</span>
      },
    },
    {
      accessorKey: 'email',
      header: () => t('contact.columns.email'),
      meta: {
        displayName: t('contact.columns.email'),
      },
      cell: ({ row }) => row.getValue('email') || '-',
    },
    {
      accessorKey: 'customerName',
      header: () => t('contact.columns.customerName'),
      meta: {
        displayName: t('contact.columns.customerName'),
      },
      cell: ({ row }) => {
        const customerName = row.getValue('customerName') as string
        return customerName || (
          <span className='text-muted-foreground'>
            {t('contact.empty.customer')}
          </span>
        )
      },
    },
    {
      accessorKey: 'position',
      header: () => t('contact.columns.position'),
      meta: {
        displayName: t('contact.columns.position'),
      },
      cell: ({ row }) => row.getValue('position') || '-',
    },
    {
      accessorKey: 'department',
      header: () => t('contact.columns.department'),
      meta: {
        displayName: t('contact.columns.department'),
      },
      cell: ({ row }) => row.getValue('department') || '-',
    },
    {
      accessorKey: 'wechat',
      header: () => t('contact.columns.wechat'),
      meta: {
        displayName: t('contact.columns.wechat'),
        className: 'w-[110px]',
      },
      cell: ({ row }) => row.getValue('wechat') || '-',
    },
    {
      accessorKey: 'birthdate',
      header: () => t('contact.columns.birthdate'),
      meta: {
        displayName: t('contact.columns.birthdate'),
        className: 'w-[110px]',
      },
      cell: ({ row }) => {
        const birthdate = row.getValue('birthdate') as string
        if (!birthdate) return '-'

        const date = new Date(birthdate)
        const now = new Date()
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
                {birthDay === now.getDate()
                  ? t('contact.birthdate.today')
                  : t('contact.birthdate.inDays', { count: birthDay - now.getDate() })}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: () => t('contact.columns.createdAt'),
      meta: {
        displayName: t('contact.columns.createdAt'),
        className: 'w-[110px]',
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue('createdAt'))
        return date.toLocaleDateString('zh-CN')
      },
    },
    {
      id: 'actions',
      header: () => t('contact.columns.actions'),
      enableHiding: false,
      meta: {
        displayName: t('contact.columns.actions'),
        className: 'w-[120px]',
      },
    },
  ]
}
