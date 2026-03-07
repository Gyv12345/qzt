import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { type Role } from "./schema";

type RolesColumnsOptions = {
  onEdit: (role: Role) => void;
  onDelete: (role: Role) => void;
};

export function getRolesColumns(
  _options: RolesColumnsOptions,
): ColumnDef<Role>[] {
  return [
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
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      meta: {
        className: "w-[40px]",
      },
    },
    {
      accessorKey: "name",
      header: "角色名称",
      cell: ({ row }) => <div>{row.getValue("name")}</div>,
    },
    {
      accessorKey: "code",
      header: "角色编码",
      cell: ({ row }) => <div>{row.getValue("code")}</div>,
    },
    {
      accessorKey: "type",
      header: "类型",
      cell: ({ row }) => {
        const type = row.getValue("type") as string;
        const typeMap: Record<string, string> = {
          system: "系统角色",
          team: "团队角色",
          SYSTEM: "系统",
          TEAM: "团队",
        };
        return <Badge variant="outline">{typeMap[type] || type}</Badge>;
      },
    },
    {
      accessorKey: "dataScope",
      header: "数据范围",
      cell: ({ row }) => {
        const dataScope = row.getValue("dataScope") as string;
        const dataScopeMap: Record<string, string> = {
          all: "全部数据",
          department: "本部门",
          department_and_sub: "本部门及下级",
          custom: "自定义",
          self: "仅本人",
        };
        return <div>{dataScopeMap[dataScope] || dataScope}</div>;
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const isEnabled = status === "ACTIVE";
        return (
          <Badge variant={isEnabled ? "default" : "secondary"}>
            {isEnabled ? "启用" : "禁用"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "创建时间",
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return <div>{date.toLocaleDateString("zh-CN")}</div>;
      },
    },
    {
      id: "actions",
      header: "操作",
      enableHiding: false,
    },
  ];
}
