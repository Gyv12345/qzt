import { ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { Payment } from "../types/payment";

// 收款方式映射
const paymentMethodMap: Record<
  number,
  { label: string; variant: "default" | "secondary" | "outline" }
> = {
  1: { label: "银行转账", variant: "default" },
  2: { label: "微信", variant: "secondary" },
  3: { label: "支付宝", variant: "outline" },
  4: { label: "现金", variant: "default" },
};

// 收款状态映射
const paymentStatusMap: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  PENDING: { label: "待确认", variant: "secondary" },
  CONFIRMED: { label: "已确认", variant: "default" },
  REJECTED: { label: "已拒绝", variant: "destructive" },
};

// 格式化金额
function formatAmount(amount: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amount);
}

// 格式化日期
function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

export const paymentsColumns: ColumnDef<Payment>[] = [
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
      return contractCode || <span className="text-muted-foreground">-</span>;
    },
    meta: {
      className: "w-[120px]",
    },
  },
  {
    accessorKey: "amount",
    header: "收款金额",
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
    accessorKey: "method",
    header: "收款方式",
    cell: ({ row }) => {
      const method = row.getValue("method") as number;
      const config = paymentMethodMap[method] || paymentMethodMap[1];
      return <Badge variant={config.variant}>{config.label}</Badge>;
    },
    meta: {
      className: "w-[100px]",
    },
  },
  {
    accessorKey: "payTime",
    header: "付款时间",
    cell: ({ row }) => {
      const payTime = row.getValue("payTime") as string;
      return <span className="font-mono text-sm">{formatDate(payTime)}</span>;
    },
    meta: {
      className: "w-[100px]",
    },
  },
  {
    accessorKey: "status",
    header: "状态",
    cell: ({ row }) => {
      const status = (row.getValue("status") as string) || "PENDING";
      const config = paymentStatusMap[status] || paymentStatusMap.PENDING;
      return <Badge variant={config.variant}>{config.label}</Badge>;
    },
    meta: {
      className: "w-[90px]",
    },
  },
  {
    accessorKey: "voucherUrl",
    header: "凭证",
    cell: ({ row }) => {
      const voucherUrl = row.getValue("voucherUrl") as string;
      if (!voucherUrl) return <span className="text-muted-foreground">-</span>;

      return (
        <a
          href={voucherUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline text-sm"
        >
          查看凭证
        </a>
      );
    },
    meta: {
      className: "w-[80px]",
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
