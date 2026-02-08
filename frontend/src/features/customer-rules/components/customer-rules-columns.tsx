import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { CustomerRule } from "../hooks/use-customer-rules";

type GetCustomerRulesColumnsOptions = {
  t: (key: string) => string;
  onEnabledChange: (id: number, enabled: boolean) => void;
};

export function getCustomerRulesColumns({
  t,
  onEnabledChange,
}: GetCustomerRulesColumnsOptions): ColumnDef<CustomerRule>[] {
  return [
    {
      accessorKey: "title",
      header: () => t("customerRule.columns.title"),
      meta: {
        displayName: t("customerRule.columns.title"),
        className: "w-[180px]",
      },
      cell: ({ row }) => {
        return <div className="font-medium">{row.getValue("title")}</div>;
      },
    },
    {
      accessorKey: "code",
      header: () => t("customerRule.columns.code"),
      meta: {
        displayName: t("customerRule.columns.code"),
        className: "w-[150px]",
      },
      cell: ({ row }) => {
        const code = row.getValue("code") as string;
        const codeLabels: Record<string, string> = {
          FOLLOW_DAYS: "跟进天数",
          NO_CONTACT_DAYS: "未联系天数",
          CONTRACT_EXPIRY_DAYS: "合同到期天数",
          PAYMENT_OVERDUE_DAYS: "付款逾期天数",
        };
        return <Badge variant="outline">{codeLabels[code] || code}</Badge>;
      },
    },
    {
      accessorKey: "description",
      header: () => t("customerRule.columns.description"),
      meta: {
        displayName: t("customerRule.columns.description"),
        className: "w-[250px]",
      },
      cell: ({ row }) => {
        const description = row.getValue("description") as string;
        return (
          <div className="text-sm text-muted-foreground">
            {description || "-"}
          </div>
        );
      },
    },
    {
      accessorKey: "daysValue",
      header: () => t("customerRule.columns.daysValue"),
      meta: {
        displayName: t("customerRule.columns.daysValue"),
        className: "w-[100px]",
      },
      cell: ({ row }) => {
        const daysValue = row.getValue("daysValue") as number;
        return <div className="font-medium">{daysValue} 天</div>;
      },
    },
    {
      accessorKey: "enabled",
      header: () => t("customerRule.columns.enabled"),
      meta: {
        displayName: t("customerRule.columns.enabled"),
        className: "w-[80px]",
      },
      cell: ({ row }) => {
        const rule = row.original as CustomerRule;
        return (
          <Switch
            checked={rule.enabled}
            onCheckedChange={(checked) => onEnabledChange(rule.id, checked)}
          />
        );
      },
    },
    {
      accessorKey: "updatedAt",
      header: () => t("customerRule.columns.updatedAt"),
      meta: {
        displayName: t("customerRule.columns.updatedAt"),
        className: "w-[120px]",
      },
      cell: ({ row }) => {
        const date = new Date(row.getValue("updatedAt"));
        return date.toLocaleDateString("zh-CN");
      },
    },
  ];
}
