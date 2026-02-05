import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import type { Contract } from '../types/contract'

interface DataTableRowActionsProps {
  row: {
    original: Contract
    getValue: (key: string) => any
  }
  onEdit: (contract: Contract) => void
  onDelete: (contract: Contract) => void
  onUpdatePaymentStatus?: (contract: Contract) => void
}

export function DataTableRowActions({
  row,
  onEdit,
  onDelete,
  onUpdatePaymentStatus,
}: DataTableRowActionsProps) {
  const contract = row.original

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
        <DropdownMenuItem onClick={() => onEdit(contract)}>
          编辑
        </DropdownMenuItem>
        {onUpdatePaymentStatus && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onUpdatePaymentStatus(contract)}>
              更新收款状态
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(contract)}
          className='text-destructive focus:text-destructive'
        >
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
