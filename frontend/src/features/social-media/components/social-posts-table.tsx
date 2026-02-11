/**
 * 社交媒体内容列表表格组件
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
  Send,
  Clock,
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
import type {
  SocialMediaPost,
  SocialMediaPostStatus,
} from "../types/social-media";
import { PLATFORM_CONFIG, POST_STATUS_CONFIG } from "../types/social-media";

interface SocialPostsTableProps {
  data: SocialMediaPost[];
  loading?: boolean;
  onEdit?: (post: SocialMediaPost) => void;
  onDelete?: (post: SocialMediaPost) => void;
  onPublish?: (post: SocialMediaPost) => void;
  onSchedule?: (post: SocialMediaPost) => void;
  onCancelSchedule?: (post: SocialMediaPost) => void;
}

const statusVariantMap: Record<
  SocialMediaPostStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "secondary",
  scheduled: "outline",
  publishing: "default",
  published: "default",
  failed: "destructive",
};

export function SocialPostsTable({
  data,
  loading = false,
  onEdit,
  onDelete,
  onPublish,
  onSchedule,
  onCancelSchedule,
}: SocialPostsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns: ColumnDef<SocialMediaPost>[] = [
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
      accessorKey: "title",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            标题
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate font-medium">
          {row.getValue("title")}
        </div>
      ),
    },
    {
      accessorKey: "account",
      header: "发布账号",
      cell: ({ row }) => {
        const account = row.getValue("account") as any;
        if (!account) return "-";
        const platform = account.platform as string;
        const config =
          PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG];
        return (
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: config?.color || "#ccc" }}
            />
            <span>{account.accountName}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const status = row.getValue("status") as SocialMediaPostStatus;
        const config = POST_STATUS_CONFIG[status];
        return (
          <Badge variant={statusVariantMap[status] || "secondary"}>
            {config?.label || status}
          </Badge>
        );
      },
    },
    {
      accessorKey: "scheduledAt",
      header: "定时发布",
      cell: ({ row }) => {
        const scheduledAt = row.getValue("scheduledAt") as string;
        const status = row.getValue("status") as SocialMediaPostStatus;
        if (!scheduledAt || status !== "scheduled") return "-";
        const date = new Date(scheduledAt);
        return (
          <div className="flex items-center gap-1 text-sm">
            <Clock className="h-3 w-3" />
            {date.toLocaleString("zh-CN")}
          </div>
        );
      },
    },
    {
      accessorKey: "content",
      header: "内容预览",
      cell: ({ row }) => {
        const content = row.getValue("content") as string;
        return (
          <div className="max-w-[250px] truncate text-sm text-muted-foreground">
            {content || "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "publishedAt",
      header: "发布时间",
      cell: ({ row }) => {
        const publishedAt = row.getValue("publishedAt") as string;
        if (!publishedAt) return "-";
        return new Date(publishedAt).toLocaleString("zh-CN");
      },
    },
    {
      accessorKey: "createdAt",
      header: "创建时间",
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as string;
        return new Date(createdAt).toLocaleDateString("zh-CN");
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const post = row.original;
        const status = post.status;

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

              {status === "draft" && onPublish && (
                <DropdownMenuItem onClick={() => onPublish(post)}>
                  <Send className="mr-2 h-4 w-4" />
                  立即发布
                </DropdownMenuItem>
              )}

              {status === "draft" && onSchedule && (
                <DropdownMenuItem onClick={() => onSchedule(post)}>
                  <Clock className="mr-2 h-4 w-4" />
                  定时发布
                </DropdownMenuItem>
              )}

              {status === "scheduled" && onCancelSchedule && (
                <DropdownMenuItem onClick={() => onCancelSchedule(post)}>
                  <Clock className="mr-2 h-4 w-4" />
                  取消定时
                </DropdownMenuItem>
              )}

              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(post)}>
                  <Pencil className="mr-2 h-4 w-4" />
                  编辑
                </DropdownMenuItem>
              )}

              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(post)}
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
        暂无内容数据
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
