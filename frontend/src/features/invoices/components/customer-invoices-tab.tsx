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
import { useInvoices } from "../hooks/use-invoices";
import { InvoiceFormDialog } from "./invoice-form-dialog";
import { useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { InvoiceItem } from "../types/invoice";

type CustomerInvoicesTabProps = {
  customerId: string;
  customerName?: string;
};

export function CustomerInvoicesTab({ customerId }: CustomerInvoicesTabProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<
    InvoiceItem | undefined
  >();

  const { data, isLoading } = useInvoices({
    customerId,
    page: 1,
    pageSize: 50,
  });

  const invoices = data?.data || [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  };

  const handleCreate = () => {
    setEditingInvoice(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (invoice: InvoiceItem) => {
    setEditingInvoice(invoice);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingInvoice(undefined);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: any }> = {
      PENDING: { label: "待开票", variant: "secondary" },
      ISSUED: { label: "已开票", variant: "default" },
      CANCELLED: { label: "已作废", variant: "outline" },
    };
    const config = statusMap[status] || statusMap.PENDING;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const columns = useMemo(
    () => [
      {
        id: "invoiceNo",
        header: "发票号码",
        cell: ({ row }: any) => row.original.invoiceNo || "-",
      },
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
        id: "invoiceDate",
        header: "开票日期",
        cell: ({ row }: any) => {
          const date = row.original.invoiceDate;
          return date
            ? format(new Date(date), "yyyy-MM-dd", { locale: zhCN })
            : "-";
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
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={handleCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            新建发票
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无发票记录
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

      <InvoiceFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        invoice={editingInvoice}
        onSuccess={handleRefresh}
      />
    </>
  );
}
