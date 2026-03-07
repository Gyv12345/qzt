import { useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
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
import { useFollowRecords } from "../hooks/use-follow-records";
import { FollowType, FOLLOW_TYPE_ICONS } from "../types/follow-record";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

type FollowRecordsCompactTableProps = {
  customerId: string;
  onEdit?: (record: any) => void;
  onDelete?: (id: string) => void;
};

export function FollowRecordsCompactTable({
  customerId,
  onEdit,
  onDelete,
}: FollowRecordsCompactTableProps) {
  const { data, isLoading } = useFollowRecords({
    customerId,
    page: 1,
    pageSize: 50,
  });

  const records = data?.data || [];

  const columns = useMemo(
    () => [
      {
        id: "type",
        header: "类型",
        cell: ({ row }: any) => {
          const type = row.original.type;
          const Icon = FOLLOW_TYPE_ICONS[type as FollowType];
          return (
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
            </div>
          );
        },
      },
      {
        id: "content",
        header: "内容",
        cell: ({ row }: any) => (
          <div className="max-w-xs truncate">{row.original.content}</div>
        ),
      },
      {
        id: "nextTime",
        header: "下次跟进",
        cell: ({ row }: any) => {
          const nextTime = row.original.nextTime;
          return nextTime ? (
            <span className="text-sm">
              {format(new Date(nextTime), "yyyy-MM-dd", { locale: zhCN })}
            </span>
          ) : (
            "-"
          );
        },
      },
      {
        id: "createdAt",
        header: "创建时间",
        cell: ({ row }: any) => {
          const createdAt = row.original.createdAt;
          return (
            <span className="text-sm text-muted-foreground">
              {format(new Date(createdAt), "yyyy-MM-dd", { locale: zhCN })}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                onClick={() => onEdit(row.original)}
                className="text-sm text-primary hover:underline"
              >
                编辑
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(row.original.id)}
                className="text-sm text-destructive hover:underline"
              >
                删除
              </button>
            )}
          </div>
        ),
      },
    ],
    [onEdit, onDelete],
  );

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">暂无跟进记录</div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id} className="h-10">
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="py-2">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                暂无数据
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
