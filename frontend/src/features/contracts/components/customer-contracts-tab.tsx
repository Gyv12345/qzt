import { useMemo, useState } from "react";
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
import { Plus, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useContracts } from "../hooks/use-contracts";
import { ContractFormDrawer } from "./contract-form-drawer";
import type { Contract } from "../types/contract";

type CustomerContractsTabProps = {
  customerId: string;
  customerName?: string;
};

export function CustomerContractsTab({
  customerId,
}: CustomerContractsTabProps) {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<
    Contract | undefined
  >();

  const { data, isLoading } = useContracts({
    customerId,
    page: 1,
    pageSize: 50,
  });

  const contracts = data?.data || [];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["contracts"] });
  };

  const handleCreate = () => {
    setEditingContract(undefined);
    setDrawerOpen(true);
  };

  const handleView = (contract: Contract) => {
    setEditingContract(contract);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditingContract(undefined);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<
      string,
      {
        label: string;
        variant: "default" | "secondary" | "outline" | "destructive";
      }
    > = {
      UNPAID: { label: "待收款", variant: "secondary" },
      PARTIAL: { label: "部分收款", variant: "outline" },
      PAID: { label: "已收款", variant: "default" },
    };
    const config = statusMap[status] || statusMap.UNPAID;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
    }).format(amount);
  };

  const formatDate = (dateStr: string | Date) => {
    return new Date(dateStr).toLocaleDateString("zh-CN");
  };

  const columns = useMemo(
    () => [
      {
        id: "contractNo",
        header: "合同编号",
        cell: ({ row }: { row: { original: Contract } }) => (
          <span className="font-medium">{row.original.contractNo || "-"}</span>
        ),
      },
      {
        id: "products",
        header: "产品",
        cell: ({ row }: { row: { original: Contract } }) => {
          const items = row.original.items;
          if (!items || items.length === 0) {
            return <span className="text-muted-foreground">-</span>;
          }
          const productNames = items
            .map((item) => item.product?.name)
            .filter(Boolean)
            .join(", ");
          return (
            <span className="text-sm truncate max-w-[150px] block">
              {productNames || "-"}
            </span>
          );
        },
      },
      {
        id: "totalAmount",
        header: "金额",
        cell: ({ row }: { row: { original: Contract } }) => (
          <span className="font-medium">
            {formatAmount(row.original.totalAmount)}
          </span>
        ),
      },
      {
        id: "status",
        header: "收款状态",
        cell: ({ row }: { row: { original: Contract } }) =>
          getStatusBadge(row.original.status),
      },
      {
        id: "serviceStart",
        header: "服务开始",
        cell: ({ row }: { row: { original: Contract } }) =>
          formatDate(row.original.serviceStart),
      },
      {
        id: "serviceEnd",
        header: "服务结束",
        cell: ({ row }: { row: { original: Contract } }) =>
          formatDate(row.original.serviceEnd),
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }: { row: { original: Contract } }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleView(row.original)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Eye className="h-3 w-3" />
              查看
            </button>
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: contracts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={handleCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            新建合同
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : contracts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无合同记录
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

      <ContractFormDrawer
        open={drawerOpen}
        onOpenChange={handleDrawerClose}
        contract={editingContract}
        onSuccess={handleRefresh}
      />
    </>
  );
}
