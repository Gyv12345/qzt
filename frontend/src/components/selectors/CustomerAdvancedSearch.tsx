import { useState } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CustomersTable } from '@/features/customers/components/customers-table'
import type { Customer } from '@/features/customers/types/customer'

interface CustomerAdvancedSearchProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (customer: Customer) => void
}

// 临时路由用于搜索参数（不影响主应用路由）
const mockSearch = {}
const mockNavigate = (opts: any) => {}

export function CustomerAdvancedSearch({
  open,
  onOpenChange,
  onSelect,
}: CustomerAdvancedSearchProps) {
  const queryClient = useQueryClient()
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] })
  }

  const handleSelect = () => {
    if (selectedCustomer) {
      onSelect(selectedCustomer)
      onOpenChange(false)
      setSelectedCustomer(null)
    }
  }

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer)
  }

  const handleDoubleClick = (customer: Customer) => {
    onSelect(customer)
    onOpenChange(false)
    setSelectedCustomer(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-6xl max-h-[90vh] overflow-hidden flex flex-col'>
        <DialogHeader>
          <DialogTitle>高级查找 - 选择企业</DialogTitle>
          <DialogDescription>
            搜索并选择企业。可以使用筛选功能快速定位。
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-hidden'>
          <CustomersTable
            search={mockSearch as any}
            navigate={mockNavigate as any}
            onEdit={() => {}}
            onRefresh={handleRefresh}
            onRowClick={handleRowClick}
            onRowDoubleClick={handleDoubleClick}
            selectedCustomerId={selectedCustomer?.id}
          />
        </div>

        <DialogFooter className='gap-2 sm:gap-0'>
          <Button
            type='button'
            variant='outline'
            onClick={() => {
              onOpenChange(false)
              setSelectedCustomer(null)
            }}
          >
            取消
          </Button>
          <Button
            type='button'
            onClick={handleSelect}
            disabled={!selectedCustomer}
          >
            选择
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
