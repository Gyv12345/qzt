import { Row } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { Customer } from '../types/customer'

interface DataTableRowActionsProps {
  row: Row<Customer>
  onEdit: (customer: Customer) => void
  onDelete: (customer: Customer) => void
}

export function DataTableRowActions({ row, onEdit, onDelete }: DataTableRowActionsProps) {
  const customer = row.original

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>打开菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[160px]'>
        <DropdownMenuItem onClick={() => onEdit(customer)}>
          编辑
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => console.log('查看详情', customer.id)}>
          查看详情
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => console.log('跟进记录', customer.id)}>
          跟进记录
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(customer)}
          className='text-destructive focus:text-destructive'
        >
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
