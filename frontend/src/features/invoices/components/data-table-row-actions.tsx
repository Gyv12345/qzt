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
import type { Invoice } from "../types/invoice";

interface DataTableRowActionsProps {
  row: Row<Invoice>;
  onEdit: (invoice: Invoice) => void;
  onDelete: (invoice: Invoice) => void;
}

export function DataTableRowActions({
  row,
  onEdit,
  onDelete,
}: DataTableRowActionsProps) {
  const invoice = row.original;

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
        <DropdownMenuItem onClick={() => onEdit(invoice)}>
          编辑
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => console.log("查看详情", invoice.id)}>
          查看详情
        </DropdownMenuItem>
        {invoice.customerId && (
          <DropdownMenuItem
            onClick={() => console.log("查看客户", invoice.customerId)}
          >
            查看客户
          </DropdownMenuItem>
        )}
        {invoice.contractId && (
          <DropdownMenuItem
            onClick={() => console.log("查看合同", invoice.contractId)}
          >
            查看合同
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(invoice)}
          className="text-destructive focus:text-destructive"
        >
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
