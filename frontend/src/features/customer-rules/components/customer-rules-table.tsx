import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination, DataTableToolbar } from "@/components/data-table";
import { getCustomerRulesColumns } from "./customer-rules-columns";
import {
  useCustomerRules,
  useUpdateCustomerRule,
  type CustomerRule,
} from "../hooks/use-customer-rules";
import { CustomerRuleEditDrawer } from "./customer-rule-edit-drawer";

type CustomerRulesTableProps = {
  onRefresh: () => void;
};

export function CustomerRulesTable({ onRefresh }: CustomerRulesTableProps) {
  const { t } = useTranslation();
  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [sorting, setSorting] = useState<SortingState>([]);
  const [editingRule, setEditingRule] = useState<CustomerRule | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);

  const { data, isLoading, error } = useCustomerRules();
  const updateMutation = useUpdateCustomerRule();

  const rules = data || [];

  // 处理启用/禁用切换
  const handleEnabledChange = useCallback(
    async (id: number, enabled: boolean) => {
      try {
        await updateMutation.mutateAsync({
          id,
          data: { enabled },
        });
        onRefresh();
      } catch (error) {
        console.error("更新状态失败:", error);
      }
    },
    [updateMutation, onRefresh],
  );

  // 处理编辑
  const handleEdit = useCallback((rule: CustomerRule) => {
    setEditingRule(rule);
    setIsEditDrawerOpen(true);
  }, []);

  // 创建列定义
  const columns = useMemo(() => {
    return getCustomerRulesColumns({ t, onEnabledChange: handleEnabledChange });
  }, [t, handleEnabledChange]);

  const table = useReactTable({
    data: rules,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
    },
    enableRowSelection: false,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

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
        <p className="text-muted-foreground">加载客户规则数据失败</p>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'max-sm:has-[div[role="toolbar"]]:mb-16',
          "flex flex-1 flex-col gap-4",
        )}
      >
        <DataTableToolbar
          table={table}
          searchPlaceholder={t("customerRule.searchPlaceholder")}
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
                    onClick={() => handleEdit(row.original)}
                    className="cursor-pointer group/row hover:bg-muted/50"
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

      <CustomerRuleEditDrawer
        rule={editingRule}
        open={isEditDrawerOpen}
        onClose={() => {
          setIsEditDrawerOpen(false);
          setEditingRule(null);
        }}
      />
    </>
  );
}
