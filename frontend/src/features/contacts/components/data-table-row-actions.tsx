import { Row } from "@tanstack/react-table";
import { MoreHorizontal, Link2, Building2, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Contact } from "../types/contact";

interface DataTableRowActionsProps {
  row: Row<Contact>;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
  onLinkCustomer: (contact: Contact) => void;
  onCreateCustomer: (contact: Contact) => void;
}

export function DataTableRowActions({
  row,
  onEdit,
  onDelete,
  onLinkCustomer,
  onCreateCustomer,
}: DataTableRowActionsProps) {
  const contact = row.original;

  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" onClick={() => onEdit(contact)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => onDelete(contact)}>
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          <DropdownMenuItem onClick={() => onLinkCustomer(contact)}>
            <Link2 className="mr-2 h-4 w-4" />
            关联客户
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onCreateCustomer(contact)}>
            <Building2 className="mr-2 h-4 w-4" />
            创建客户
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
