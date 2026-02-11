/**
 * 社交媒体账号管理表格组件
 */

import { useState } from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import type { SocialMediaAccount } from "../types/social-media";
import { PLATFORM_CONFIG } from "../types/social-media";

interface SocialAccountsTableProps {
  data: SocialMediaAccount[];
  loading?: boolean;
  onEdit?: (account: SocialMediaAccount) => void;
  onDelete?: (account: SocialMediaAccount) => void;
  onRefresh?: (account: SocialMediaAccount) => void;
}

export function SocialAccountsTable({
  data,
  loading = false,
  onEdit,
  onDelete,
  onRefresh,
}: SocialAccountsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns: ColumnDef<SocialMediaAccount>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="全选"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="选择行"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "platform",
      header: "平台",
      cell: ({ row }) => {
        const platform = row.getValue("platform") as string;
        const config =
          PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
        return (
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: config?.color || "#ccc" }}
            />
            <span>{config?.label || platform}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "accountName",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            账号名称
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("accountName")}</div>
      ),
    },
    {
      accessorKey: "accountId",
      header: "平台账号ID",
      cell: ({ row }) => {
        const accountId = row.getValue("accountId") as string;
        return accountId ? <code className="text-xs">{accountId}</code> : "-";
      },
    },
    {
      accessorKey: "expiresAt",
      header: "令牌过期时间",
      cell: ({ row }) => {
        const expiresAt = row.getValue("expiresAt") as string;
        if (!expiresAt) return <span className="text-muted-foreground">-</span>;
        const expiryDate = new Date(expiresAt);
        const now = new Date();
        const isExpiringSoon =
          expiryDate.getTime() - now.getTime() < 7 * 24 * 60 * 60 * 1000;
        return (
          <span className={isExpiringSoon ? "text-orange-500 font-medium" : ""}>
            {expiryDate.toLocaleDateString("zh-CN")}
          </span>
        );
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const status = row.getValue("status") as number;
        return status === 1 ? (
          <Badge variant="default">启用</Badge>
        ) : (
          <Badge variant="secondary">禁用</Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "添加时间",
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as string;
        return new Date(createdAt).toLocaleDateString("zh-CN");
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const account = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">打开菜单</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {onRefresh && (
                <DropdownMenuItem onClick={() => onRefresh(account)}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  刷新令牌
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(account)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  编辑
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(account)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: false,
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        加载中...
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        暂无账号数据
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          已选择{" "}
          <strong>{table.getFilteredSelectedRowModel().rows.length}</strong> /{" "}
          <strong>{table.getFilteredRowModel().rows.length}</strong> 行
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
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

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          第 {table.getState().pagination.pageIndex + 1} 页 / 共{" "}
          {table.getPageCount()} 页
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            下一页
          </Button>
        </div>
      </div>
    </div>
  );
}
