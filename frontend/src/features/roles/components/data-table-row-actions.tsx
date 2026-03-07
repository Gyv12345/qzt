import { Row } from "@tanstack/react-table";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Role } from "../data/schema";

interface DataTableRowActionsProps {
  row: Row<Role>;
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
}

export function DataTableRowActions({
  row,
  onEdit,
  onDelete,
}: DataTableRowActionsProps) {
  const role = row.original;

  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" onClick={() => onEdit(role)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onDelete(role)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
