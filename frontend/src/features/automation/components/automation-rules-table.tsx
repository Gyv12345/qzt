import { useMemo, useCallback } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAutomationRules, useToggleAutomationRule, useTriggerAutomationRule } from '../hooks/use-automation'
import { automationRulesColumns } from './automation-rules-columns'
import type { AutomationRule } from '../types/automation'

type DataTableProps = {
  onEdit: (rule: AutomationRule) => void
  onDelete: (rule: AutomationRule) => void
  onRefresh: () => void
}

export function AutomationRulesTable({ onEdit, onDelete, onRefresh }: DataTableProps) {
  const toggleMutation = useToggleAutomationRule()
  const triggerMutation = useTriggerAutomationRule()

  const { data, isLoading, error } = useAutomationRules()

  const rules = data || []

  // 处理启用/禁用
  const handleToggle = useCallback(async (rule: AutomationRule) => {
    try {
      await toggleMutation.mutateAsync(rule.id)
      onRefresh()
    } catch (error) {
      console.error('切换状态失败:', error)
    }
  }, [toggleMutation, onRefresh])

  // 处理手动触发
  const handleTrigger = useCallback(async (rule: AutomationRule) => {
    try {
      await triggerMutation.mutateAsync(rule.id)
      onRefresh()
    } catch (error) {
      console.error('触发失败:', error)
    }
  }, [triggerMutation, onRefresh])

  // 创建带有回调的列定义
  const columns = useMemo(() => {
    return automationRulesColumns.map((col) => {
      if (col.id === 'actions') {
        return {
          ...col,
          cell: (props: any) => {
            const rule = props.row.original
            return (
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => handleToggle(rule)}
                  className='text-sm text-primary hover:underline'
                  disabled={toggleMutation.isPending}
                >
                  {rule.enabled ? '禁用' : '启用'}
                </button>
                <button
                  onClick={() => handleTrigger(rule)}
                  className='text-sm text-primary hover:underline'
                  disabled={triggerMutation.isPending || !rule.enabled}
                >
                  触发
                </button>
                <button
                  onClick={() => onEdit(rule)}
                  className='text-sm text-primary hover:underline'
                >
                  编辑
                </button>
                <button
                  onClick={() => onDelete(rule)}
                  className='text-sm text-destructive hover:underline'
                >
                  删除
                </button>
              </div>
            )
          },
        }
      }
      return col
    })
  }, [onEdit, onDelete, handleToggle, handleTrigger, toggleMutation.isPending, triggerMutation.isPending])

  const table = useReactTable({
    data: rules,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-32'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent' />
      </div>
    )
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center py-32'>
        <p className='text-muted-foreground'>加载自动化规则失败</p>
      </div>
    )
  }

  return (
    <div className='rounded-md border'>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id} className={header.column.columnDef.meta?.className}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className='h-24 text-center'
              >
                暂无自动化规则
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
