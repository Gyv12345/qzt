import { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { type Permission } from './schema'

export const columns: ColumnDef<Permission>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: '权限名称',
    cell: ({ row }) => <div>{row.getValue('name')}</div>,
  },
  {
    accessorKey: 'code',
    header: '权限编码',
    cell: ({ row }) => <div className="font-mono text-sm">{row.getValue('code')}</div>,
  },
  {
    accessorKey: 'module',
    header: '所属模块',
    cell: ({ row }) => {
      const module = row.getValue('module') as string
      return <Badge variant="outline">{module}</Badge>
    },
  },
  {
    accessorKey: 'description',
    header: '描述',
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate">{row.getValue('description') || '-'}</div>
    ),
  },
  {
    accessorKey: 'status',
    header: '状态',
    cell: ({ row }) => {
      const status = row.getValue('status') as number
      return (
        <Badge variant={status === 1 ? 'default' : 'secondary'}>
          {status === 1 ? '启用' : '禁用'}
        </Badge>
      )
    },
  },
]
