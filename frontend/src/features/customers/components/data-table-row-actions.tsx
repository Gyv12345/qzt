import { Row } from '@tanstack/react-table'
import { MoreHorizontal, Edit, Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
    <div className='flex items-center gap-1'>
      <Button size='sm' variant='ghost' onClick={() => onEdit(customer)}>
        <Edit className='h-4 w-4' />
      </Button>
      <Button size='sm' variant='ghost' onClick={() => onDelete(customer)}>
        <Trash2 className='h-4 w-4 text-destructive' />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size='sm' variant='ghost'>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-[160px]'>
          <DropdownMenuItem onClick={() => console.log('跟进记录', customer.id)}>
            <FileText className='mr-2 h-4 w-4' />
            跟进记录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
