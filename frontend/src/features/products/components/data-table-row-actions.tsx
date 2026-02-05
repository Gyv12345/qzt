import { Row } from '@tanstack/react-table'
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Product } from '../types/product'

interface DataTableRowActionsProps {
  row: Row<Product>
  onEdit: (product: Product) => void
  onDelete: (product: Product) => void
}

export function DataTableRowActions({ row, onEdit, onDelete }: DataTableRowActionsProps) {
  const product = row.original

  return (
    <div className='flex items-center gap-1'>
      <Button size='sm' variant='ghost' onClick={() => onEdit(product)}>
        <Edit className='h-4 w-4' />
      </Button>
      <Button size='sm' variant='ghost' onClick={() => onDelete(product)}>
        <Trash2 className='h-4 w-4 text-destructive' />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size='sm' variant='ghost'>
            <MoreHorizontal className='h-4 w-4' />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-[160px]'>
          <DropdownMenuItem onClick={() => console.log('查看详情', product.id)}>
            查看详情
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
