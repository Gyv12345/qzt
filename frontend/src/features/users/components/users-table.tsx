import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { UsersBatchActions } from "./users-batch-actions";
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
import { getUsersColumns } from "./users-columns";
import { useUsers } from "../hooks/use-users";

type DataTableProps = {
  search: Record<string, unknown>;
  navigate: NavigateFn;
};

export function UsersTable({ search, navigate }: DataTableProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [sorting, setSorting] = useState<SortingState>([]);

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
      { columnId: "username", searchKey: "username", type: "string" },
      { columnId: "status", searchKey: "status", type: "array" },
    ],
  });

  // 构建查询参数
  const queryParams = {
    page: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    username: columnFilters.find((f) => f.id === "username")?.value as string,
  };

  const { data, isLoading, error } = useUsers(queryParams);

  // 后端返回分页数据: { data, total, page, pageSize, totalPages }
  const users = data?.data || [];
  const total = data?.total || 0;
  const columns = useMemo(() => getUsersColumns({ t }), [t]);

  // 获取选中的用户 ID
  const selectedIds = Object.keys(rowSelection)
    .filter((key) => rowSelection[key as keyof typeof rowSelection])
    .map((index) => users[Number(index)]?.id)
    .filter(Boolean) as string[];

  const table = useReactTable({
    data: users,
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
        <p className="text-muted-foreground">{t("user.loadFailed")}</p>
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
      {selectedIds.length > 0 && (
        <UsersBatchActions
          selectedIds={selectedIds}
          onClearSelection={() => setRowSelection({})}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
          }}
        />
      )}

      <DataTableToolbar
        table={table}
        searchPlaceholder={t("user.searchPlaceholder")}
        searchKey="username"
        filters={[
          {
            columnId: "status",
            title: t("user.status"),
            options: [
              { label: t("user.statusEnabled"), value: "1" },
              { label: t("user.statusDisabled"), value: "0" },
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
                  {t("common.noData")}
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
