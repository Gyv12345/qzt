import type { ColumnDef } from "@tanstack/react-table";
import type { Row } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { type Permission } from "./schema";

const typeBadgeVariant = (type: string) => {
  switch (type) {
    case "menu":
      return "default";
    case "button":
      return "secondary";
    case "data":
      return "outline";
    default:
      return "outline";
  }
};

const typeLabel = (type: string) => {
  switch (type) {
    case "menu":
      return "菜单";
    case "button":
      return "按钮";
    case "data":
      return "数据";
    default:
      return type;
  }
};

// 行操作组件
interface DataTableRowActionsProps {
  row: Row<Permission>;
  onEdit: (permission: Permission) => void;
  onDelete: (permission: Permission) => void;
}

function DataTableRowActions({
  row,
  onEdit,
  onDelete,
}: DataTableRowActionsProps) {
  const permission = row.original;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onEdit(permission)}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 w-8"
        title="编辑"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onDelete(permission)}
        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-destructive h-8 w-8"
        title="删除"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 6h18" />
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        </svg>
      </button>
    </div>
  );
}

export const createColumns = (
  onEdit?: (permission: Permission) => void,
  onDelete?: (permission: Permission) => void
): ColumnDef<Permission>[] => {
  const baseColumns: ColumnDef<Permission>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "权限名称",
      cell: ({ row }) => <div>{row.getValue("name")}</div>,
    },
    {
      accessorKey: "code",
      header: "权限编码",
      cell: ({ row }) => (
        <div className="font-mono text-sm">{row.getValue("code")}</div>
      ),
    },
    {
      accessorKey: "type",
      header: "类型",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        return (
          <Badge variant={typeBadgeVariant(type)}>
            {typeLabel(type)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "description",
      header: "描述",
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate">
          {row.getValue("description") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const status = row.getValue("status") as number;
        return (
          <Badge variant={status === 1 ? "default" : "secondary"}>
            {status === 1 ? "启用" : "禁用"}
          </Badge>
        );
      },
    },
  ];

  if (onEdit && onDelete) {
    baseColumns.push({
      id: "actions",
      header: "操作",
      cell: ({ row }: { row: Row<Permission> }) => (
        <DataTableRowActions
          row={row}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ),
    });
  }

  return baseColumns;
};

export const columns: ColumnDef<Permission>[] = createColumns();
