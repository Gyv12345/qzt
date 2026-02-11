import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableRowActions } from "./data-table-row-actions";
import type { ContractTemplate } from "../types/contract-template";
import { formatDate } from "@/lib/utils";

type GetContractTemplatesColumnsOptions = {
  t: (key: string) => string;
};

export function getContractTemplatesColumns({
  t,
}: GetContractTemplatesColumnsOptions): ColumnDef<ContractTemplate>[] {
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
      header: () => t("contractTemplate.columns.name"),
      meta: {
        displayName: t("contractTemplate.columns.name"),
        className: "w-[180px]",
      },
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "code",
      header: () => t("contractTemplate.columns.code"),
      meta: {
        displayName: t("contractTemplate.columns.code"),
        className: "w-[120px]",
      },
      cell: ({ row }) => (
        <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
          {row.getValue("code")}
        </code>
      ),
    },
    {
      accessorKey: "description",
      header: () => t("contractTemplate.columns.description"),
      meta: {
        displayName: t("contractTemplate.columns.description"),
        className: "w-[200px]",
      },
      cell: ({ row }) => {
        const description = row.getValue("description") as string;
        return (
          <div className="max-w-[200px] truncate text-muted-foreground">
            {description || "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: () => t("contractTemplate.columns.status"),
      meta: {
        displayName: t("contractTemplate.columns.status"),
        className: "w-[80px]",
      },
      cell: ({ row }) => {
        const status = row.getValue("status") as number;
        return (
          <span
            className={
              status === 1 ? "text-green-600" : "text-muted-foreground"
            }
          >
            {status === 1
              ? t("contractTemplate.status.active")
              : t("contractTemplate.status.inactive")}
          </span>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: () => t("contractTemplate.columns.createdAt"),
      meta: {
        displayName: t("contractTemplate.columns.createdAt"),
        className: "w-[140px]",
      },
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as string;
        return formatDate(createdAt);
      },
    },
    {
      id: "actions",
      cell: DataTableRowActions as any,
      enableHiding: false,
      meta: {
        displayName: t("contractTemplate.columns.actions"),
        className: "w-[120px]",
      },
    },
  ];
}
