import { Row } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CmsContent } from "../types/cms";

interface CmsDataTableRowActionsProps {
  row: Row<CmsContent>;
  onEdit: (content: CmsContent) => void;
  onDelete: (content: CmsContent) => void;
  onPublish?: (content: CmsContent) => void;
  onUnpublish?: (content: CmsContent) => void;
}

export function DataTableRowActions({
  row,
  onEdit,
  onDelete,
  onPublish,
  onUnpublish,
}: CmsDataTableRowActionsProps) {
  const content = row.original;
  const isPublished = content.status === "PUBLISHED";

  return (
    <div className="flex items-center gap-1">
      <Button size="sm" variant="ghost" onClick={() => onEdit(content)}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onDelete(content)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="ghost">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[180px]">
          {isPublished ? (
            <DropdownMenuItem onClick={() => onUnpublish?.(content)}>
              <EyeOff className="mr-2 h-4 w-4" />
              取消发布
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onPublish?.(content)}>
              <Eye className="mr-2 h-4 w-4" />
              发布
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => console.log("查看详情", content.id)}>
            <ExternalLink className="mr-2 h-4 w-4" />
            查看详情
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
