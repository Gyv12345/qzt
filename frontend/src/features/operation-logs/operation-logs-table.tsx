import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  ColumnDef,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getScrmApi } from '@/services/api'
import type { OperationLog } from '@/models'
import { Loader2 } from 'lucide-react'

export function OperationLogsTable() {
  const { t } = useTranslation()

  // 使用真实的 API 获取数据
  const { data: response, isLoading, error } = useQuery({
    queryKey: ['operation-logs'],
    queryFn: () => getScrmApi().logsControllerFindOperationLogs(),
  })

  // 从响应中提取数据
  const data = response?.data || []

  const columns: ColumnDef<OperationLog>[] = [
    {
      accessorKey: 'username',
      header: t('settings.logs.operationLog.columns.username'),
      cell: ({ row }) => <div>{row.getValue('username')}</div>,
    },
    {
      accessorKey: 'resource',
      header: t('settings.logs.operationLog.columns.module'),
      cell: ({ row }) => <div>{row.getValue('resource')}</div>,
    },
    {
      accessorKey: 'action',
      header: t('settings.logs.operationLog.columns.operation'),
      cell: ({ row }) => <div>{row.getValue('action')}</div>,
    },
    {
      accessorKey: 'resourceId',
      header: '资源ID',
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue('resourceId') || '-'}</div>
      ),
    },
    {
      accessorKey: 'ip',
      header: t('settings.logs.operationLog.columns.ipAddress'),
      cell: ({ row }) => <div>{row.getValue('ip') || '-'}</div>,
    },
    {
      accessorKey: 'createdAt',
      header: t('settings.logs.operationLog.columns.operationTime'),
      cell: ({ row }) => {
        const date = new Date(row.getValue('createdAt'))
        return <div>{date.toLocaleString('zh-CN')}</div>
      },
    },
  ]

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.logs.operationLog.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.logs.operationLog.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-24 items-center justify-center text-red-600">
            {t('common.error')}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.logs.operationLog.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
                  className="h-24 text-center"
                >
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
