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
import { SlidersHorizontal } from "lucide-react";
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
import { Button } from "@/components/ui/button";
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
import { CustomersBatchActions } from "./customers-batch-actions";
import {
  CustomerAdvancedFilter,
  type CustomerFilterValues,
} from "./customer-advanced-filter";
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
  onImport: _onImport,
  onExport: _onExport,
  onRowClick,
  onRowDoubleClick: _onRowDoubleClick,
  selectedCustomerId,
}: DataTableProps) {
  const { t } = useTranslation();
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [advancedFilterOpen, setAdvancedFilterOpen] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<CustomerFilterValues>(
    {},
  );

  const deleteMutation = useDeleteCustomer();

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
      { columnId: "name", searchKey: "name", type: "string" },
      { columnId: "customerLevel", searchKey: "customerLevel", type: "array" },
    ],
  });

  // 构建查询参数
  const queryParams: Record<string, any> = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    // 基础搜索（来自 URL 的 name 参数）
    keyword: columnFilters.find((f) => f.id === "name")?.value as string,
    // 高级筛选的等级
    customerLevel: advancedFilters.customerLevels?.join(",") as any,
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
    } catch (_error) {
      // Error is handled by the mutation
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  // 创建带有回调的列定义
  const columns = useMemo(() => {
    return getCustomersColumns({
      t,
      onOpenDetail: onRowClick,
      onEdit,
      onDelete: handleDeleteClick,
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
    return Object.keys(rowSelection).filter(
      (key) => (rowSelection as any)[key],
    );
  }, [rowSelection]);

  const handleClearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  // 应用高级筛选
  const handleApplyAdvancedFilter = useCallback(
    (filters: CustomerFilterValues) => {
      setAdvancedFilters(filters);

      // 更新 URL 筛选状态
      const newFilters = [...columnFilters];

      // 更新 name 筛选
      const nameIndex = newFilters.findIndex((f) => f.id === "name");
      if (filters.name) {
        if (nameIndex >= 0) {
          newFilters[nameIndex] = { id: "name", value: filters.name };
        } else {
          newFilters.push({ id: "name", value: filters.name });
        }
      } else if (nameIndex >= 0) {
        newFilters.splice(nameIndex, 1);
      }

      // 更新 customerLevel 筛选
      const levelIndex = newFilters.findIndex((f) => f.id === "customerLevel");
      if (filters.customerLevels && filters.customerLevels.length > 0) {
        if (levelIndex >= 0) {
          newFilters[levelIndex] = {
            id: "customerLevel",
            value: filters.customerLevels,
          };
        } else {
          newFilters.push({
            id: "customerLevel",
            value: filters.customerLevels,
          });
        }
      } else if (levelIndex >= 0) {
        newFilters.splice(levelIndex, 1);
      }

      onColumnFiltersChange(newFilters);
    },
    [columnFilters, onColumnFiltersChange],
  );

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
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAdvancedFilterOpen(true)}
            className="h-8 gap-1"
          >
            <SlidersHorizontal className="h-4 w-4" />
            高级筛选
          </Button>
        }
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

      {/* 高级筛选抽屉 */}
      <CustomerAdvancedFilter
        open={advancedFilterOpen}
        onOpenChange={setAdvancedFilterOpen}
        onApply={handleApplyAdvancedFilter}
        initialFilters={advancedFilters}
      />
    </div>
  );
}
