import { useMemo, useState } from 'react'
import { Download, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'

type ExportColumn = {
  id: string
  displayName: string
}

interface DataTableExportImportProps {
  module: string
  onImportSuccess?: () => void
}

export function DataTableExportImport({ module, onImportSuccess }: DataTableExportImportProps) {
  const { t } = useTranslation()
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)

  const exportColumns = useMemo<ExportColumn[]>(() => {
    if (module === 'contact') {
      return [
        { id: 'name', displayName: t('contact.columns.name') },
        { id: 'phone', displayName: t('contact.columns.phone') },
        { id: 'email', displayName: t('contact.columns.email') },
        { id: 'customerName', displayName: t('contact.columns.customerName') },
        { id: 'position', displayName: t('contact.columns.position') },
        { id: 'department', displayName: t('contact.columns.department') },
      ]
    }
    return []
  }, [module, t])

  const handleExport = (payload: { range: string; columns: string[] }) => {
    console.log('export payload', payload)
    toast.success('已触发导出任务')
    setExportDialogOpen(false)
  }

  const handleImport = () => {
    toast.success('导入任务已提交')
    setImportDialogOpen(false)
    onImportSuccess?.()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='outline' size='sm' className='h-8'>
            <Download className='mr-2 h-4 w-4' />
            导出
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => handleExport({ range: 'selected', columns: exportColumns.map((col) => col.id) })}>
            导出选中行
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleExport({ range: 'currentPage', columns: exportColumns.map((col) => col.id) })}>
            导出当前页
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setExportDialogOpen(true)}>
            高级导出...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button variant='outline' size='sm' className='h-8' onClick={() => setImportDialogOpen(true)}>
        <Upload className='mr-2 h-4 w-4' />
        导入
      </Button>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        columns={exportColumns}
        onExport={handleExport}
      />

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
      />
    </>
  )
}

function ExportDialog({
  open,
  onOpenChange,
  columns,
  onExport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  columns: ExportColumn[]
  onExport: (payload: { range: string; columns: string[] }) => void
}) {
  const [selectedColumns, setSelectedColumns] = useState(columns.map((col) => col.id))
  const [exportRange, setExportRange] = useState<'all' | 'filtered' | 'selected'>('filtered')

  const toggleColumn = (id: string, checked: boolean) => {
    setSelectedColumns((prev) =>
      checked ? [...prev, id] : prev.filter((columnId) => columnId !== id)
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>高级导出</DialogTitle>
        </DialogHeader>

        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label>导出范围</Label>
            <RadioGroup value={exportRange} onValueChange={(value) => setExportRange(value as any)}>
              <div className='flex items-center gap-2'>
                <RadioGroupItem value='all' id='export-all' />
                <Label htmlFor='export-all'>导出全部数据</Label>
              </div>
              <div className='flex items-center gap-2'>
                <RadioGroupItem value='filtered' id='export-filtered' />
                <Label htmlFor='export-filtered'>导出筛选后的数据</Label>
              </div>
              <div className='flex items-center gap-2'>
                <RadioGroupItem value='selected' id='export-selected' />
                <Label htmlFor='export-selected'>导出选中的行</Label>
              </div>
            </RadioGroup>
          </div>

          <div className='space-y-2'>
            <Label>选择导出字段</Label>
            <div className='max-h-60 space-y-2 overflow-y-auto rounded-md border p-4'>
              {columns.map((column) => (
                <div key={column.id} className='flex items-center gap-2'>
                  <Checkbox
                    checked={selectedColumns.includes(column.id)}
                    onCheckedChange={(value) => toggleColumn(column.id, !!value)}
                  />
                  <span>{column.displayName}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onExport({ range: exportRange, columns: selectedColumns })}>
            导出 Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ImportDialog({
  open,
  onOpenChange,
  onImport,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-xl'>
        <DialogHeader>
          <DialogTitle>导入数据</DialogTitle>
        </DialogHeader>

        <div className='space-y-2 text-sm text-muted-foreground'>
          当前仅提供导入流程入口，后续将支持字段映射与预览。
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={onImport}>确认导入</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
