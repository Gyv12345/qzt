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
  OperationLog,
  LogsControllerFindOperationLogsParams,
} from "@/models";
import { Loader2 } from "lucide-react";
import { DataTablePagination } from "@/components/data-table";

export function OperationLogsTable() {
  const { t } = useTranslation();

  // 分页状态
  const [{ pageIndex, pageSize }, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // 构建查询参数
  const queryParams: LogsControllerFindOperationLogsParams = {
    page: pageIndex + 1,
    pageSize,
  };

  // 使用真实的 API 获取数据
  const {
    data: response,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["operation-logs", pageIndex, pageSize],
    queryFn: () =>
      getScrmApi().logsControllerFindOperationLogs(queryParams) as any,
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

  // 操作类型中文映射
  const actionMap: Record<string, string> = {
    VIEW: "查看",
    CREATE: "创建",
    UPDATE: "更新",
    DELETE: "删除",
    UNKNOWN: "未知",
  };

  // 获取操作的中文显示
  const getActionLabel = (action: string) => {
    return actionMap[action] || action;
  };

  const columns: ColumnDef<OperationLog>[] = [
    {
      accessorKey: "username",
      header: t("settings.logs.operationLog.columns.username"),
      cell: ({ row }) => <div>{row.getValue("username")}</div>,
    },
    {
      accessorKey: "resource",
      header: t("settings.logs.operationLog.columns.module"),
      cell: ({ row }) => <div>{row.getValue("resource")}</div>,
    },
    {
      accessorKey: "action",
      header: t("settings.logs.operationLog.columns.operation"),
      cell: ({ row }) => <div>{getActionLabel(row.getValue("action"))}</div>,
    },
    {
      accessorKey: "resourceId",
      header: "资源ID",
      cell: ({ row }) => (
        <div className="font-mono text-sm">
          {row.getValue("resourceId") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "ip",
      header: t("settings.logs.operationLog.columns.ipAddress"),
      cell: ({ row }) => <div>{row.getValue("ip") || "-"}</div>,
    },
    {
      accessorKey: "createdAt",
      header: t("settings.logs.operationLog.columns.operationTime"),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return <div>{date.toLocaleString("zh-CN")}</div>;
      },
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
          <CardTitle>{t("settings.logs.operationLog.title")}</CardTitle>
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
          <CardTitle>{t("settings.logs.operationLog.title")}</CardTitle>
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
        <CardTitle>{t("settings.logs.operationLog.title")}</CardTitle>
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
