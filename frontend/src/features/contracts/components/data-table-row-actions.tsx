import { Row } from "@tanstack/react-table";
import { MoreHorizontal, Edit, Trash2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Contract } from "../types/contract";

interface DataTableRowActionsProps {
  row: Row<Contract>;
  onEdit: (contract: Contract) => void;
  onDelete: (contract: Contract) => void;
  onUpdatePaymentStatus?: (contract: Contract) => void;
}

export function DataTableRowActions({
  row,
  onEdit,
  onDelete,
  onUpdatePaymentStatus,
}: DataTableRowActionsProps) {
  const contract = row.original;

  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" onClick={() => onEdit(contract)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onDelete(contract)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          {onUpdatePaymentStatus && (
            <>
              <DropdownMenuItem onClick={() => onUpdatePaymentStatus(contract)}>
                <DollarSign className="mr-2 h-4 w-4" />
                更新收款状态
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem
            onClick={() => console.log("查看详情", contract.id)}
          >
            查看详情
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
