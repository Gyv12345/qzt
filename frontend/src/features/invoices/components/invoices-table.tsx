import { useEffect, useState, useMemo, useCallback } from "react";
import {
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
import { cn } from "@/lib/utils";
import { type NavigateFn, useTableUrlState } from "@/hooks/use-table-url-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination, DataTableToolbar } from "@/components/data-table";
import { invoicesColumns } from "./invoices-columns";
import { DataTableRowActions } from "./data-table-row-actions";
import { useInvoices, useDeleteInvoice } from "../hooks/use-invoices";
import type { Invoice } from "../types/invoice";

type DataTableProps = {
  search: Record<string, unknown>;
  navigate: NavigateFn;
  onEdit: (invoice: Invoice) => void;
  onRefresh: () => void;
};

export function InvoicesTable({
  search,
  navigate,
  onEdit,
  onRefresh,
}: DataTableProps) {
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [sorting, setSorting] = useState<SortingState>([]);

  const deleteMutation = useDeleteInvoice();

  // 从 URL 获取分页和筛选参数
  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
  } = useTableUrlState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: false },
    columnFilters: [
      { columnId: "customerName", searchKey: "customerName", type: "string" },
      { columnId: "month", searchKey: "month", type: "string" },
    ],
  });

  // 构建查询参数
  const queryParams = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    customerName: columnFilters.find((f) => f.id === "customerName")
      ?.value as string,
    month: columnFilters.find((f) => f.id === "month")?.value as string,
  };

  const { data, isLoading, error } = useInvoices(queryParams);

  const invoices = data?.data || [];
  const total = data?.total || 0;

  // 处理删除
  const handleDelete = useCallback(
    async (invoice: Invoice) => {
      if (window.confirm(`确定要删除这条开票记录吗？此操作不可恢复。`)) {
        try {
          await deleteMutation.mutateAsync(invoice.id);
          onRefresh();
        } catch (error) {
          console.error("删除失败:", error);
        }
      }
    },
    [deleteMutation, onRefresh],
  );

  // 创建带有回调的列定义
  const columns = useMemo(() => {
    return invoicesColumns.map((col) => {
      if (col.id === "actions") {
        return {
          ...col,
          cell: (props: any) => {
            return (
              <DataTableRowActions
                row={props.row}
                onEdit={onEdit}
                onDelete={handleDelete}
              />
            );
          },
        };
      }
      return col;
    });
  }, [onEdit, handleDelete]);

  const table = useReactTable({
    data: invoices,
    columns,
    state: {
      sorting,
      pagination: {
        ...pagination,
        pageSize: pagination.pageSize,
        pageIndex: pagination.pageIndex,
      },
      rowSelection,
      columnFilters,
      columnVisibility,
    },
    pageCount: Math.ceil(total / pagination.pageSize),
    enableRowSelection: true,
    onPaginationChange,
    onColumnFiltersChange,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: true,
  });

  useEffect(() => {
    const pageCount = Math.ceil(total / pagination.pageSize);
    if (pagination.pageIndex >= pageCount && pageCount > 0) {
      onPaginationChange({ ...pagination, pageIndex: pageCount - 1 });
    }
  }, [total, pagination, onPaginationChange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32">
        <p className="text-muted-foreground">加载开票记录失败</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        "flex flex-1 flex-col gap-4",
      )}
    >
      <DataTableToolbar
        table={table}
        searchPlaceholder="搜索客户名称..."
        searchKey="customerName"
      />
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="group/row">
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        "bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted",
                        header.column.columnDef.meta?.className,
                        header.column.columnDef.meta?.thClassName,
                      )}
                    >
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
                  className="group/row"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        "bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted",
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName,
                      )}
                    >
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
      <DataTablePagination table={table} className="mt-auto" />
    </div>
  );
}
