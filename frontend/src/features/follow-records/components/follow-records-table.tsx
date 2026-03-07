import React, { useMemo } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  type ColumnDef,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination, DataTableToolbar } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import {
  FollowType,
  FOLLOW_TYPE_ICONS,
  type FollowRecordItem,
} from "../types/follow-record";
import { useFollowRecords } from "../hooks/use-follow-records";

type DataTableProps = {
  customerId: string;
  onEdit?: (record: FollowRecordItem) => void;
  onDelete?: (id: string) => void;
};

/** 跟进类型标签样式 */
const FOLLOW_TYPE_BADGES: Record<
  FollowType,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  [FollowType.PHONE]: { label: "电话", variant: "default" },
  [FollowType.WECHAT]: { label: "微信", variant: "secondary" },
  [FollowType.VISIT]: { label: "上门", variant: "outline" },
  [FollowType.EMAIL]: { label: "邮件", variant: "default" },
  [FollowType.OTHER]: { label: "其他", variant: "secondary" },
};

export function FollowRecordsTable({
  customerId,
  onEdit,
  onDelete,
}: DataTableProps) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data, isLoading, error } = useFollowRecords({
    customerId,
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
  });

  const records = data?.data || [];
  const total = data?.total || 0;

  const columns = useMemo<ColumnDef<FollowRecordItem>[]>(() => {
    return [
      {
        accessorKey: "type",
        header: "跟进类型",
        cell: ({ row }) => {
          const type = row.getValue("type") as FollowType;
          const badge = FOLLOW_TYPE_BADGES[type];
          const Icon = FOLLOW_TYPE_ICONS[type];
          return (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">
                <Icon className="h-4 w-4" />
              </span>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
          );
        },
      },
      {
        accessorKey: "content",
        header: "跟进内容",
        cell: ({ row }) => {
          const content = row.getValue("content") as string;
          return (
            <div className="max-w-md truncate" title={content}>
              {content}
            </div>
          );
        },
      },
      {
        accessorKey: "nextTime",
        header: "下次跟进",
        cell: ({ row }) => {
          const nextTime = row.getValue("nextTime") as string;
          if (!nextTime)
            return <span className="text-muted-foreground">-</span>;
          return (
            <span className="text-sm">
              {format(new Date(nextTime), "yyyy-MM-dd HH:mm", { locale: zhCN })}
            </span>
          );
        },
      },
      {
        accessorKey: "creator",
        header: "创建人",
        cell: ({ row }) => {
          const creator = row.original.creator;
          return <span>{creator?.name || "-"}</span>;
        },
      },
      {
        accessorKey: "createdAt",
        header: "创建时间",
        cell: ({ row }) => {
          const createdAt = row.getValue("createdAt") as string;
          return (
            <span className="text-sm text-muted-foreground">
              {format(new Date(createdAt), "yyyy-MM-dd HH:mm", {
                locale: zhCN,
              })}
            </span>
          );
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const record = row.original;
          return (
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(record)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  编辑
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(record.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  删除
                </button>
              )}
            </div>
          );
        },
      },
    ];
  }, [onEdit, onDelete]);

  const table = useReactTable({
    data: records,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      pagination,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    pageCount: Math.ceil(total / pagination.pageSize) || 1,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-500">加载失败: {(error as Error).message}</div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">暂无跟进记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <DataTableToolbar table={table} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
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
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
