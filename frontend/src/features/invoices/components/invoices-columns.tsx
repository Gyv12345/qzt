import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { Invoice } from "../types/invoice";

// 格式化金额
function formatAmount(amount: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amount);
}

export const invoicesColumns: ColumnDef<Invoice>[] = [
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
    accessorKey: "customerName",
    header: "客户名称",
    cell: ({ row }) => {
      const customerName = row.getValue("customerName") as string;
      return <span className="font-medium">{customerName || "-"}</span>;
    },
  },
  {
    accessorKey: "contractCode",
    header: "合同编号",
    cell: ({ row }) => {
      const contractCode = row.getValue("contractCode") as string;
      return (
        contractCode || (
          <span className="text-muted-foreground">无关联合同</span>
        )
      );
    },
    meta: {
      className: "w-[120px]",
    },
  },
  {
    accessorKey: "amount",
    header: "开票金额",
    cell: ({ row }) => {
      const amount = row.getValue("amount") as number;
      return (
        <span className="font-semibold text-primary">
          {formatAmount(amount)}
        </span>
      );
    },
    meta: {
      className: "w-[120px]",
    },
  },
  {
    accessorKey: "count",
    header: "份数",
    cell: ({ row }) => {
      const count = row.getValue("count") as number;
      return <Badge variant="outline">{count} 份</Badge>;
    },
    meta: {
      className: "w-[80px]",
    },
  },
  {
    accessorKey: "month",
    header: "开票月份",
    cell: ({ row }) => {
      const month = row.getValue("month") as string;
      return <span className="font-mono text-sm">{month}</span>;
    },
    meta: {
      className: "w-[100px]",
    },
  },
  {
    accessorKey: "remark",
    header: "备注",
    cell: ({ row }) => {
      const remark = row.getValue("remark") as string;
      return remark || "-";
    },
  },
  {
    accessorKey: "createdAt",
    header: "创建时间",
    cell: ({ row }) => {
      const date = new Date(row.getValue("createdAt"));
      return date.toLocaleDateString("zh-CN");
    },
    meta: {
      className: "w-[100px]",
    },
  },
  {
    id: "actions",
    header: "操作",
    meta: {
      className: "w-[60px]",
    },
  },
];
