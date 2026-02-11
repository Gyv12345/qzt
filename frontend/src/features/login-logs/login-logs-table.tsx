import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import {
  type PaginationState,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getScrmApi } from "@/services/api";
import type {
  LoginLog,
  LoginLogsControllerFindLoginLogsParams,
} from "@/models";
import { Loader2 } from "lucide-react";
import { DataTablePagination } from "@/components/data-table";

export function LoginLogsTable() {
  const { t } = useTranslation();

  // 分页状态
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // 构建查询参数
  const queryParams: LoginLogsControllerFindLoginLogsParams = {
    page: pageIndex + 1,
    pageSize,
  };

  // 使用真实的 API 获取数据
  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["login-logs", pageIndex, pageSize],
    queryFn: () =>
      getScrmApi().loginLogsControllerFindLoginLogs(queryParams) as any,
  });

  // 从响应中提取数据
  const data = (response as any)?.data || [];
  const total = (response as any)?.total || 0;

  // 处理分页变化
  const onPaginationChange = useCallback(
    (
      newPagination:
        | PaginationState
        | ((prev: PaginationState) => PaginationState),
    ) => {
      setPagination(
        typeof newPagination === "function"
          ? newPagination({ pageIndex, pageSize })
          : newPagination,
      );
    },
    [pageIndex, pageSize],
  );

  const columns: ColumnDef<LoginLog>[] = [
    {
      accessorKey: "username",
      header: t("settings.logs.loginLog.columns.username"),
      cell: ({ row }) => <div>{row.getValue("username")}</div>,
    },
    {
      accessorKey: "ip",
      header: t("settings.logs.loginLog.columns.ipAddress"),
      cell: ({ row }) => <div>{row.getValue("ip") || "-"}</div>,
    },
    {
      accessorKey: "createdAt",
      header: t("settings.logs.loginLog.columns.loginTime"),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return <div>{date.toLocaleString("zh-CN")}</div>;
      },
    },
    {
      accessorKey: "status",
      header: t("settings.logs.loginLog.columns.status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as "SUCCESS" | "FAILED";
        return (
          <div>
            {status === "SUCCESS" ? (
              <span className="text-green-600">
                {t("settings.logs.loginLog.status.success")}
              </span>
            ) : (
              <span className="text-red-600">
                {t("settings.logs.loginLog.status.failed")}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "browser",
      header: t("settings.logs.loginLog.columns.browser"),
      cell: ({ row }) => <div>{row.getValue("browser") || "-"}</div>,
    },
    {
      accessorKey: "os",
      header: t("settings.logs.loginLog.columns.os"),
      cell: ({ row }) => <div>{row.getValue("os") || "-"}</div>,
    },
  ];

  const table = useReactTable({
    data,
    columns,
    pageCount: Math.ceil(total / pageSize),
    state: {
      pagination: { pageIndex, pageSize },
    },
    onPaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.logs.loginLog.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("settings.logs.loginLog.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-24 items-center justify-center text-red-600">
            {t("common.error")}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.logs.loginLog.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
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
                  {t("common.noData")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <DataTablePagination table={table} />
    </Card>
  );
}
