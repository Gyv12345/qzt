import { Row } from "@tanstack/react-table";
import { MoreHorizontal, Edit, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Product } from "../types/product";

interface DataTableRowActionsProps {
  row: Row<Product>;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onViewDetail?: (productId: string) => void;
}

export function DataTableRowActions({
  row,
  onEdit,
  onDelete,
  onViewDetail,
}: DataTableRowActionsProps) {
  const product = row.original;

  return (
    <div className="flex items-center gap-1">
      {onViewDetail && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onViewDetail(product.id)}
          title="查看详情"
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onEdit(product)}
        title="编辑"
      >
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onDelete(product)}
        title="删除"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[160px]">
          {onViewDetail && (
            <DropdownMenuItem onClick={() => onViewDetail(product.id)}>
              查看详情
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
