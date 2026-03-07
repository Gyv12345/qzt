import { Row } from "@tanstack/react-table";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Customer } from "../types/customer";

interface DataTableRowActionsProps {
  row: Row<Customer>;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export function DataTableRowActions({
  row,
  onEdit,
  onDelete,
}: DataTableRowActionsProps) {
  const customer = row.original;

  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" onClick={() => onEdit(customer)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onDelete(customer)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
