import { useState, useMemo, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { getContractsColumns } from "./contracts-columns";
import { DataTableRowActions } from "./data-table-row-actions";
import {
  useContracts,
  useDeleteContract,
  useUpdatePaymentStatus,
} from "../hooks/use-contracts";
import type { Contract } from "../types/contract";

type DataTableProps = {
  search: Record<string, unknown>;
  navigate: NavigateFn;
  onEdit: (contract: Contract) => void;
  onRefresh: () => void;
};

export function ContractsTable({
  search,
  navigate,
  onEdit,
  onRefresh,
}: DataTableProps) {
  const { t } = useTranslation();
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [sorting, setSorting] = useState<SortingState>([]);

  const deleteMutation = useDeleteContract();
  const updatePaymentStatusMutation = useUpdatePaymentStatus();

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
    ],
  });

  // 构建查询参数
  const queryParams = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    customerId: columnFilters.find((f) => f.id === "customerId")
      ?.value as string,
  };

  const { data, isLoading, error } = useContracts(queryParams);

  const contracts = data?.data || [];
  const total = data?.total || 0;

  // 处理删除
  const handleDelete = useCallback(
    async (contract: Contract) => {
      if (window.confirm(`确定要删除合同吗？此操作不可恢复。`)) {
        try {
          await deleteMutation.mutateAsync(contract.id);
          onRefresh();
        } catch (error) {
          console.error("删除失败:", error);
        }
      }
    },
    [deleteMutation, onRefresh],
  );

  // 处理更新收款状态
  const handleUpdatePaymentStatus = useCallback(
    async (contract: Contract) => {
      try {
        await updatePaymentStatusMutation.mutateAsync(contract.id);
        onRefresh();
      } catch (error) {
        console.error("更新收款状态失败:", error);
      }
    },
    [updatePaymentStatusMutation, onRefresh],
  );

  // 创建带有回调的列定义
  const columns = useMemo(() => {
    return getContractsColumns({ t }).map((col) => {
      if (col.id === "actions") {
        return {
          ...col,
          cell: (props: any) => {
            return (
              <DataTableRowActions
                row={props.row}
                onEdit={onEdit}
                onDelete={handleDelete}
                onUpdatePaymentStatus={handleUpdatePaymentStatus}
              />
            );
          },
        };
      }
      return col;
    });
  }, [onEdit, handleDelete, handleUpdatePaymentStatus]);

  const table = useReactTable({
    data: contracts,
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
        <p className="text-muted-foreground">加载合同数据失败</p>
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
        searchPlaceholder={t("contract.searchPlaceholder")}
        searchKey="customerName"
        searchMode="submit"
        searchButtonLabel={t("common.search")}
        filters={[]}
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
