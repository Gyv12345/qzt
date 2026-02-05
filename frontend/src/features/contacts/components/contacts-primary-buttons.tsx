import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface ContactsPrimaryButtonsProps {
  onCreate: () => void
}

export function ContactsPrimaryButtons({ onCreate }: ContactsPrimaryButtonsProps) {
  return (
    <div className='flex items-center gap-2'>
      <Button size='sm' className='h-8 gap-1' onClick={onCreate}>
        <Plus className='h-3.5 w-3.5' />
        <span className='sr-only sm:not-sr-only sm:whitespace-nowrap'>
          新建联系人
        </span>
      </Button>
    </div>
  )
}
