import { type ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/data-table";
import { LongText } from "@/components/long-text";
import type { UserEntity } from "@/models";
import { DataTableRowActions } from "./data-table-row-actions";

type GetUsersColumnsOptions = {
  t: (key: string) => string;
};

export function getUsersColumns({
  t,
}: GetUsersColumnsOptions): ColumnDef<UserEntity>[] {
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
      meta: {
        className: cn("max-md:sticky start-0 z-10 rounded-tl-[inherit]"),
      },
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
    },
    {
      accessorKey: "username",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("user.columns.username")}
        />
      ),
      cell: ({ row }) => (
        <LongText className="max-w-36 ps-3">
          {row.getValue("username")}
        </LongText>
      ),
      meta: {
        className: cn(
          "drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.1)] dark:drop-shadow-[0_1px_2px_rgb(255_255_255_/_0.1)]",
          "ps-0.5 max-md:sticky start-6 @4xl/content:table-cell @4xl/content:drop-shadow-none",
        ),
      },
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("user.columns.fullName")}
        />
      ),
      cell: ({ row }) => {
        return <LongText className="max-w-36">{row.getValue("name")}</LongText>;
      },
      meta: { className: "w-36" },
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("user.columns.email")}
        />
      ),
      cell: ({ row }) => (
        <div className="w-fit ps-2 text-nowrap">
          {row.getValue("email") || "-"}
        </div>
      ),
    },
    {
      accessorKey: "phone",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("user.columns.phoneNumber")}
        />
      ),
      cell: ({ row }) => <div>{row.getValue("phone") || "-"}</div>,
      enableSorting: false,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("user.columns.status")}
        />
      ),
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        const isEnabled = status === "ACTIVE";
        return (
          <div className="flex space-x-2">
            <Badge variant={isEnabled ? "default" : "secondary"}>
              {isEnabled ? t("user.statusEnabled") : t("user.statusDisabled")}
            </Badge>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(String(row.getValue(id)));
      },
      enableHiding: false,
      enableSorting: false,
    },
    {
      accessorKey: "department",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("user.columns.department")}
        />
      ),
      cell: ({ row }) => {
        const department = row.getValue("department") as {
          name?: string;
        } | null;
        return <span>{department?.name || "-"}</span>;
      },
      enableSorting: false,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader
          column={column}
          title={t("user.columns.createdAt")}
        />
      ),
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return <div>{date.toLocaleDateString("zh-CN")}</div>;
      },
      meta: { className: "w-[100px]" },
    },
    {
      id: "actions",
      cell: DataTableRowActions,
      meta: { className: "w-[60px]" },
    },
  ];
}
