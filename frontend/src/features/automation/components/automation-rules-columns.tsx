import { ColumnDef } from '@tanstack/react-table'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import type { AutomationRule } from '../types/automation'

// 格式化日期
function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

export const automationRulesColumns: ColumnDef<AutomationRule>[] = [
  {
    accessorKey: 'name',
    header: '规则名称',
    cell: ({ row }) => {
      const name = row.getValue('name') as string
      return <span className='font-medium'>{name}</span>
    },
  },
  {
    accessorKey: 'trigger',
    header: '触发条件',
    cell: ({ row }) => {
      const trigger = row.getValue('trigger') as string
      return (
        <div className='max-w-xs'>
          <p className='text-sm truncate' title={trigger}>
            {trigger}
          </p>
        </div>
      )
    },
  },
  {
    accessorKey: 'action',
    header: '执行动作',
    cell: ({ row }) => {
      const action = row.getValue('action') as string
      return (
        <div className='max-w-xs'>
          <p className='text-sm truncate' title={action}>
            {action}
          </p>
        </div>
      )
    },
  },
  {
    accessorKey: 'enabled',
    header: '启用状态',
    cell: ({ row }) => {
      const enabled = row.getValue('enabled') as boolean
      return (
        <Badge variant={enabled ? 'default' : 'secondary'}>
          {enabled ? '已启用' : '已禁用'}
        </Badge>
      )
    },
    meta: {
      className: 'w-[100px]',
    },
  },
  {
    accessorKey: 'lastExecutedAt',
    header: '最后执行时间',
    cell: ({ row }) => {
      const lastExecutedAt = row.getValue('lastExecutedAt') as string
      return <span className='font-mono text-xs'>{formatDate(lastExecutedAt)}</span>
    },
    meta: {
      className: 'w-[150px]',
    },
  },
  {
    accessorKey: 'nextExecutedAt',
    header: '下次执行时间',
    cell: ({ row }) => {
      const nextExecutedAt = row.getValue('nextExecutedAt') as string
      return <span className='font-mono text-xs'>{formatDate(nextExecutedAt)}</span>
    },
    meta: {
      className: 'w-[150px]',
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
