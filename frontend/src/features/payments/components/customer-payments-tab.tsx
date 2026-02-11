import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
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
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePayments } from "../hooks/use-payments";
import { PaymentFormDialog } from "./payment-form-dialog";
import { useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { PaymentItem } from "../types/payment";

type CustomerPaymentsTabProps = {
  customerId: string;
  customerName?: string;
};

export function CustomerPaymentsTab({
  customerId: _customerId,
}: CustomerPaymentsTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<
    PaymentItem | undefined
  >();

  // 注意：当前 API 不支持按 customerId 筛选，这里传入的参数会被忽略
  // 实际筛选应在后端实现或通过其他方式处理
  const { data, isLoading } = usePayments({
    page: 1,
    pageSize: 50,
  });

  const payments = data?.data || [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  };

  const handleCreate = () => {
    setEditingPayment(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (payment: PaymentItem) => {
    setEditingPayment(payment);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingPayment(undefined);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      PENDING: { label: "待确认", variant: "secondary" },
      CONFIRMED: { label: "已确认", variant: "default" },
      CANCELLED: { label: "已取消", variant: "outline" },
    };
    const config = statusMap[status] || statusMap.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const columns = useMemo(
    () => [
      {
        id: "amount",
        header: "金额",
        cell: ({ row }: any) => (
          <span className="font-medium">
            ¥{Number(row.original.amount).toLocaleString()}
          </span>
        ),
      },
      {
        id: "paymentDate",
        header: "收款日期",
        cell: ({ row }: any) => {
          const date = row.original.paymentDate;
          return date
            ? format(new Date(date), "yyyy-MM-dd", { locale: zhCN })
            : "-";
        },
      },
      {
        id: "method",
        header: "收款方式",
        cell: ({ row }: any) => {
          const methodMap: Record<string, string> = {
            BANK_TRANSFER: "银行转账",
            CASH: "现金",
            CHECK: "支票",
            OTHER: "其他",
          };
          return methodMap[row.original.method] || row.original.method || "-";
        },
      },
      {
        id: "status",
        header: "状态",
        cell: ({ row }: any) => getStatusBadge(row.original.status),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }: any) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleEdit(row.original)}
              className="text-sm text-primary hover:underline"
            >
              编辑
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: payments,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={handleCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            新建收款
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无收款记录
          </div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="h-10">
                        {flexRender(
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
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-2">
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
        )}
      </div>

      <PaymentFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        payment={editingPayment}
        onSuccess={handleRefresh}
      />
    </>
  );
}
