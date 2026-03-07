import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableRowActions } from "./data-table-row-actions";
import type { Product } from "../types/product";

type GetProductsColumnsOptions = {
  t: (key: string) => string;
  onViewDetail?: (productId: string) => void;
  onEdit?: (product: Product) => void;
  onDelete?: (product: Product) => void;
};

export function getProductsColumns({
  t,
  onViewDetail,
  onEdit,
  onDelete,
}: GetProductsColumnsOptions): ColumnDef<Product>[] {
  // 金额格式化
  function formatAmount(amount: number) {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
    }).format(amount);
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
      header: () => t("product.columns.name"),
      meta: {
        displayName: t("product.columns.name"),
        className: "w-[180px]",
      },
      cell: ({ row }) => {
        const productName = row.getValue("name") as string;
        const productId = row.original.id;
        return (
          <button
            onClick={() => onViewDetail?.(productId)}
            className="font-medium text-primary hover:underline text-left"
          >
            {productName}
          </button>
        );
      },
    },
    {
      accessorKey: "code",
      header: () => t("product.columns.code"),
      meta: {
        displayName: t("product.columns.code"),
        className: "w-[120px]",
      },
      cell: ({ row }) => row.getValue("code") || "-",
    },
    {
      accessorKey: "price",
      header: () => t("product.columns.price"),
      meta: {
        displayName: t("product.columns.price"),
        className: "w-[110px]",
      },
      cell: ({ row }) => {
        const price = row.getValue("price") as number;
        return <div className="font-medium">{formatAmount(price)}</div>;
      },
    },
    {
      accessorKey: "description",
      header: () => t("product.columns.description"),
      meta: {
        displayName: t("product.columns.description"),
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
      id: "actions",
      cell: (props) =>
        onEdit && onDelete ? (
          <DataTableRowActions
            row={props.row}
            onEdit={onEdit}
            onDelete={onDelete}
            onViewDetail={onViewDetail}
          />
        ) : null,
      enableHiding: false,
      meta: {
        displayName: t("product.columns.actions"),
        className: "w-[60px] text-center",
      },
    },
  ];
}
