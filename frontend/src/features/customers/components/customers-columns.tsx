import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DataTableRowActions } from "./data-table-row-actions";
import type { Customer } from "../types/customer";

type CustomersColumnsOptions = {
  t: (key: string) => string;
  onOpenDetail?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
};

export function getCustomersColumns({
  t,
  onOpenDetail,
  onEdit,
  onDelete,
}: CustomersColumnsOptions): ColumnDef<Customer>[] {
  // 客户等级映射配置
  const customerLevelConfig: Record<
    string,
    {
      label: string;
      variant: "default" | "secondary" | "outline" | "destructive";
    }
  > = {
    LEAD: { label: t("customer.levels.LEAD"), variant: "secondary" },
    PROSPECT: { label: t("customer.levels.PROSPECT"), variant: "outline" },
    CUSTOMER: { label: t("customer.levels.CUSTOMER"), variant: "default" },
    VIP: { label: t("customer.levels.VIP"), variant: "destructive" },
  };

  function CustomerLevelBadge({ level }: { level: string | undefined }) {
    const config =
      customerLevelConfig[level || "LEAD"] || customerLevelConfig.LEAD;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  }

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
      header: () => t("customer.columns.name"),
      meta: {
        displayName: t("customer.columns.name"),
        className: "w-[180px]",
      },
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div
            className="font-medium cursor-pointer hover:text-primary transition-colors"
            onClick={() => onOpenDetail?.(customer)}
          >
            {row.getValue("name")}
          </div>
        );
      },
    },
    {
      accessorKey: "shortName",
      header: () => t("customer.columns.shortName"),
      meta: {
        displayName: t("customer.columns.shortName"),
        className: "w-[120px]",
      },
      cell: ({ row }) => row.getValue("shortName") || "-",
    },
    {
      accessorKey: "industry",
      header: () => t("customer.columns.industry"),
      meta: {
        displayName: t("customer.columns.industry"),
      },
      cell: ({ row }) => row.getValue("industry") || "-",
    },
    {
      accessorKey: "customerLevel",
      header: () => t("customer.columns.customerLevel"),
      meta: {
        displayName: t("customer.columns.customerLevel"),
        className: "w-[100px]",
      },
      cell: ({ row }) => {
        const level = row.getValue("customerLevel") as string | undefined;
        return <CustomerLevelBadge level={level} />;
      },
    },
    {
      accessorKey: "followUserName",
      header: () => t("customer.columns.followUserName"),
      meta: {
        displayName: t("customer.columns.followUserName"),
        className: "w-[100px]",
      },
      cell: ({ row }) => row.getValue("followUserName") || "-",
    },
    {
      accessorKey: "sourceChannel",
      header: () => t("customer.columns.sourceChannel"),
      meta: {
        displayName: t("customer.columns.sourceChannel"),
      },
      cell: ({ row }) => row.getValue("sourceChannel") || "-",
    },
    {
      accessorKey: "createdAt",
      header: () => t("customer.columns.createdAt"),
      meta: {
        displayName: t("customer.columns.createdAt"),
        className: "w-[110px]",
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("createdAt"));
        return date.toLocaleDateString("zh-CN");
      },
    },
    {
      id: "actions",
      cell: ({ row }: any) => (
        <DataTableRowActions row={row} onEdit={onEdit!} onDelete={onDelete!} />
      ),
      enableHiding: false,
      meta: {
        displayName: t("customer.columns.actions"),
        className: "w-[120px]",
      },
    },
  ];
}
