import { Row } from "@tanstack/react-table";
import { Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UserEntity } from "@/models";
import { useUsers } from "./users-provider";

interface DataTableRowActionsProps {
  row: Row<UserEntity>;
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { setOpen, setCurrentRow } = useUsers();
  const user = row.original;

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setCurrentRow(row.original);
          setOpen("edit");
        }}
      >
        <Edit className="h-4 w-4" />
      </Button>
      {!user.isSystem && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setCurrentRow(row.original);
            setOpen("delete");
          }}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  );
}
