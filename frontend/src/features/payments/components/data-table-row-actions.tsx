import { Row } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { Payment } from "../types/payment";

interface DataTableRowActionsProps {
  row: Row<Payment>;
  onEdit: (payment: Payment) => void;
  onDelete: (payment: Payment) => void;
  onConfirm: (payment: Payment) => void;
}

export function DataTableRowActions({
  row,
  onEdit,
  onDelete,
  onConfirm,
}: DataTableRowActionsProps) {
  const payment = row.original;
  const isPending = payment.status === "PENDING";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">打开菜单</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuItem onClick={() => onEdit(payment)}>
          编辑
        </DropdownMenuItem>
        {isPending && (
          <DropdownMenuItem
            onClick={() => onConfirm(payment)}
            className="text-primary"
          >
            确认收款
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => console.log("查看详情", payment.id)}>
          查看详情
        </DropdownMenuItem>
        {payment.contractId && (
          <DropdownMenuItem
            onClick={() => console.log("查看合同", payment.contractId)}
          >
            查看合同
          </DropdownMenuItem>
        )}
        {payment.voucherUrl && (
          <DropdownMenuItem
            onClick={() => window.open(payment.voucherUrl, "_blank")}
          >
            查看凭证
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(payment)}
          className="text-destructive focus:text-destructive"
        >
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
