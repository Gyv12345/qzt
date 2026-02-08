import { MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ContractTemplate } from "../types/contract-template";

interface DataTableRowActionsProps {
  row: {
    original: ContractTemplate;
    getIndex: () => number;
  };
  onEdit: (template: ContractTemplate) => void;
  onDelete: (template: ContractTemplate) => void;
  onPreview?: (template: ContractTemplate) => void;
}

export function DataTableRowActions({
  row,
  onEdit,
  onDelete,
  onPreview,
}: DataTableRowActionsProps) {
  const template = row.original;

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
        {onPreview && (
          <DropdownMenuItem onClick={() => onPreview(template)}>
            <Eye className="mr-2 h-4 w-4" />
            预览
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => onEdit(template)}>
          <Pencil className="mr-2 h-4 w-4" />
          编辑
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDelete(template)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
