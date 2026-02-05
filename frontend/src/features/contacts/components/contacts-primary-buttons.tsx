import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTableExportImport } from './data-table-export-import'

interface ContactsPrimaryButtonsProps {
  onCreate: () => void
  onImportSuccess?: () => void
}

export function ContactsPrimaryButtons({ onCreate, onImportSuccess }: ContactsPrimaryButtonsProps) {
  return (
    <div className='flex items-center gap-2'>
      <DataTableExportImport module='contact' onImportSuccess={onImportSuccess} />
      <Button size='sm' className='h-8 gap-1' onClick={onCreate}>
        <Plus className='h-3.5 w-3.5' />
        <span className='sr-only sm:not-sr-only sm:whitespace-nowrap'>
          新建联系人
        </span>
      </Button>
    </div>
  )
}
