import { useEffect, useState, useMemo, useCallback } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getCustomersColumns } from "./customers-columns";
import { DataTableRowActions } from "./data-table-row-actions";
import { CustomersBatchActions } from "./customers-batch-actions";
import { useCustomers, useDeleteCustomer } from "../hooks/use-customers";
import type { Customer } from "../types/customer";

type DataTableProps = {
  search: Record<string, unknown>;
  navigate: NavigateFn;
  onEdit: (customer: Customer) => void;
  onRefresh: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onRowClick?: (customer: Customer) => void;
  onRowDoubleClick?: (customer: Customer) => void;
  selectedCustomerId?: string;
};

export function CustomersTable({
  search,
  navigate,
  onEdit,
  onRefresh,
  onImport,
  onExport,
  onRowClick,
  onRowDoubleClick,
  selectedCustomerId,
}: DataTableProps) {
  const { t } = useTranslation();
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMutation = useDeleteCustomer();

  // 从 URL 获取分页和筛选参数
  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: false },
    columnFilters: [
      { columnId: "name", searchKey: "name", type: "string" },
      { columnId: "customerLevel", searchKey: "customerLevel", type: "array" },
    ],
  });

  // 构建查询参数
  const queryParams = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    name: columnFilters.find((f) => f.id === "name")?.value as string,
  };

  const { data, isLoading, error } = useCustomers(queryParams);

  const customers = data?.data || [];
  const total = data?.total || 0;

  // 处理删除 - 打开确认对话框
  const handleDeleteClick = useCallback((customer: Customer) => {
    setDeleteConfirm(customer);
  }, []);

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(deleteConfirm.id);
      onRefresh();
    } catch (error) {
      console.error("删除失败:", error);
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  // 创建带有回调的列定义
  const columns = useMemo(() => {
    return getCustomersColumns({ t, onOpenDetail: onRowClick }).map((col) => {
      if (col.id === "actions") {
        return {
          ...col,
          cell: (props: any) => {
            return (
              <DataTableRowActions
                row={props.row}
                onEdit={onEdit}
                onDelete={handleDeleteClick}
              />
            );
          },
        };
      }
      return col;
    });
  }, [onEdit, handleDeleteClick, onRowClick, t]);

  const table = useReactTable({
    data: customers,
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

  // 获取选中的客户ID列表 - 必须在所有条件返回之前调用
  const selectedCustomerIds = useMemo(() => {
    return Object.keys(rowSelection).filter((key) => rowSelection[key]);
  }, [rowSelection]);

  const handleClearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

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
        <p className="text-muted-foreground">加载客户数据失败</p>
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
      {/* 批量操作栏 */}
      {selectedCustomerIds.length > 0 && (
        <CustomersBatchActions
          selectedIds={selectedCustomerIds}
          onClearSelection={handleClearSelection}
          onSuccess={onRefresh}
        />
      )}

      <DataTableToolbar
        table={table}
        searchPlaceholder={t("customer.searchPlaceholder")}
        searchKey="name"
        searchMode="submit"
        searchButtonLabel={t("common.search")}
        filters={[
          {
            columnId: "customerLevel",
            title: t("customer.level"),
            options: [
              { label: t("customer.levels.LEAD"), value: "LEAD" },
              { label: t("customer.levels.PROSPECT"), value: "PROSPECT" },
              { label: t("customer.levels.CUSTOMER"), value: "CUSTOMER" },
              { label: t("customer.levels.VIP"), value: "VIP" },
            ],
          },
        ]}
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
              table.getRowModel().rows.map((row) => {
                const customer = row.original as Customer;
                const isSelected = selectedCustomerId === customer.id;

                return (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={cn("group/row", isSelected && "bg-muted/50")}
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
                );
              })
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

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除客户"{deleteConfirm?.name}"吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "删除中..." : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
