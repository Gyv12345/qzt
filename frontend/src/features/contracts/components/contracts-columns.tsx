import { ColumnDef } from "@tanstack/react-table";
import { DataTableRowActions } from "./data-table-row-actions";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Contract } from "../types/contract";

type GetContractsColumnsOptions = {
  t: (key: string) => string;
  onEdit?: (contract: Contract) => void;
  onDelete?: (contract: Contract) => void;
  onUpdatePaymentStatus?: (contract: Contract) => void;
};

export function getContractsColumns({
  t,
  onEdit,
  onDelete,
  onUpdatePaymentStatus,
}: GetContractsColumnsOptions): ColumnDef<Contract>[] {
  // 金额格式化
  function formatAmount(amount: number) {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
    }).format(amount);
  }

  // 日期格式化
  function formatDate(dateStr: string | Date) {
    return new Date(dateStr).toLocaleDateString("zh-CN");
  }

  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      meta: {
        className: "w-[40px]",
      },
    },
    {
      accessorKey: "contractNo",
      header: "合同编号",
      meta: {
        displayName: "合同编号",
        className: "w-[140px]",
      },
      cell: ({ row }) => {
        return <div className="font-medium">{row.getValue("contractNo")}</div>;
      },
    },
    {
      id: "customerName",
      accessorFn: (row) => row.customer?.name,
      header: () => t("contract.columns.customerName"),
      meta: {
        displayName: t("contract.columns.customerName"),
        className: "w-[180px]",
      },
      cell: ({ row }) => {
        return (
          <div className="font-medium">
            {row.original.customer?.name || "-"}
          </div>
        );
      },
    },
    {
      id: "products",
      header: "产品",
      meta: {
        displayName: "产品",
        className: "w-[150px]",
      },
      cell: ({ row }) => {
        const items = (row.original as Contract).items;
        if (!items || items.length === 0) {
          return <span className="text-muted-foreground">-</span>;
        }

        if (items.length === 1) {
          return (
            <span className="text-sm">{items[0].product?.name || "-"}</span>
          );
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-2">
                <span className="text-sm">
                  {items[0].product?.name} +{items.length - 1}
                </span>
                <ChevronDown className="ml-1 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {items.map((item, index) => (
                <DropdownMenuItem key={index} className="flex-col items-start">
                  <span className="font-medium">
                    {item.product?.name || "未知产品"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {item.quantity} × ¥{item.actualPrice}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
    {
      accessorKey: "totalAmount",
      header: "合同金额",
      meta: {
        displayName: "合同金额",
        className: "w-[120px]",
      },
      cell: ({ row }) => {
        const totalAmount = row.getValue("totalAmount") as number;
        const originalAmount = (row.original as Contract).originalAmount;
        const hasDiscount = originalAmount > totalAmount;

        return (
          <div className="flex flex-col">
            {hasDiscount && (
              <span className="text-xs text-muted-foreground line-through">
                {formatAmount(originalAmount)}
              </span>
            )}
            <div className="font-medium">{formatAmount(totalAmount)}</div>
          </div>
        );
      },
    },
    {
      accessorKey: "serviceStart",
      header: "服务开始日期",
      meta: {
        displayName: "服务开始日期",
        className: "w-[110px]",
      },
      cell: ({ row }) => formatDate(row.getValue("serviceStart")),
    },
    {
      accessorKey: "serviceEnd",
      header: "服务结束日期",
      meta: {
        displayName: "服务结束日期",
        className: "w-[110px]",
      },
      cell: ({ row }) => formatDate(row.getValue("serviceEnd")),
    },
    {
      accessorKey: "status",
      header: "收款状态",
      meta: {
        displayName: "收款状态",
        className: "w-[100px]",
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
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
      },
    },
    {
      accessorKey: "createdAt",
      header: () => t("contract.columns.createdAt"),
      meta: {
        displayName: t("contract.columns.createdAt"),
        className: "w-[110px]",
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return date.toLocaleDateString("zh-CN");
      },
    },
    {
      id: "actions",
      cell: (props) =>
        onEdit && onDelete ? (
          <DataTableRowActions
            row={props.row}
            onEdit={onEdit}
            onDelete={onDelete}
            onUpdatePaymentStatus={onUpdatePaymentStatus}
          />
        ) : null,
      enableHiding: false,
      meta: {
        displayName: t("contract.columns.actions"),
        className: "w-[120px]",
      },
    },
  ];
}
