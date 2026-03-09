import { useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { CustomerFollowRecordsTab } from "@/features/follow-records";
import { CustomerServiceTeamTab } from "@/features/service-teams";
import { CustomerContactsTab } from "@/features/contacts";
import { CustomerPaymentsTab } from "@/features/payments";
import { CustomerInvoicesTab } from "@/features/invoices";
import { CustomerContractsTab } from "@/features/contracts";
import { useCustomer } from "../hooks/use-customers";
import {
  Users,
  CreditCard,
  Receipt,
  ScrollText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDirection } from "@/context/direction-provider";

type CustomerDetailDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
};

export function CustomerDetailDrawer({
  open,
  onOpenChange,
  customerId,
}: CustomerDetailDrawerProps) {
  const { data: customer, isLoading } = useCustomer(customerId);
  const isMobile = useIsMobile();
  const { dir } = useDirection();
  const drawerSide = isMobile ? "bottom" : dir === "rtl" ? "left" : "right";
  const [infoExpanded, setInfoExpanded] = useState(false);

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side={drawerSide}
          className={isMobile ? "h-[85vh]" : "w-[800px]"}
        >
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  if (!customer) {
    return null;
  }

  const customerData = customer as any;

  // 所有信息项
  const allInfoItems = [
    { label: "公司名称", value: customerData.name },
    { label: "公司简称", value: customerData.shortName },
    { label: "公司编码", value: customerData.code },
    { label: "行业", value: customerData.industry },
    { label: "公司地址", value: customerData.address },
    { label: "公司网站", value: customerData.website },
    { label: "公司规模", value: customerData.scale },
    {
      label: "客户等级",
      value: null,
      custom: (
        <Badge
          variant={getCustomerLevelVariant(customerData.customerLevel)}
          className="text-xs"
        >
          {getCustomerLevelLabel(customerData.customerLevel)}
        </Badge>
      ),
    },
    { label: "来源渠道", value: customerData.sourceChannel },
    { label: "跟进人", value: customerData.followUserName },
    { label: "状态", value: customerData.status === 1 ? "启用" : "禁用" },
    {
      label: "首次联系",
      value: customerData.firstContactDate
        ? format(new Date(customerData.firstContactDate), "yyyy-MM-dd", {
            locale: zhCN,
          })
        : null,
    },
    {
      label: "签约时间",
      value: customerData.contractDate
        ? format(new Date(customerData.contractDate), "yyyy-MM-dd", {
            locale: zhCN,
          })
        : null,
    },
  ];

  // 默认显示 4 个（2 行 × 2 列）
  const visibleItems = infoExpanded ? allInfoItems : allInfoItems.slice(0, 4);
  const hasMoreItems = allInfoItems.length > 4;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={drawerSide}
        className={`${isMobile ? "h-[85vh]" : "w-[800px]"} flex flex-col overflow-hidden`}
      >
        {/* 固定的头部区域 */}
        <SheetHeader className="pb-2 text-start flex-shrink-0">
          <SheetTitle className="text-xl">{customerData.name}</SheetTitle>
          <SheetDescription>
            客户编号: {customerData.code || customerData.id}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-3 flex-shrink-0" />

        {/* 紧凑的基本信息区域 - 2列布局，可折叠 */}
        <div className="flex-shrink-0 space-y-2">
          {/* 主信息网格 - 2列布局 */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            {visibleItems.map((item, index) => (
              <div key={index} className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground shrink-0">
                  {item.label}:
                </span>
                {item.custom ? (
                  item.custom
                ) : (
                  <span className="truncate font-medium">
                    {item.value || "-"}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* 展开/收起按钮 */}
          {hasMoreItems && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-muted-foreground"
              onClick={() => setInfoExpanded(!infoExpanded)}
            >
              {infoExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  收起
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  展开更多 ({allInfoItems.length - 4}项)
                </>
              )}
            </Button>
          )}

          {/* 备注区域 - 如果有备注则显示 */}
          {customerData.remark && (
            <div className="bg-muted/50 rounded-md p-2 text-sm">
              <span className="text-muted-foreground mr-2">备注:</span>
              <span className="text-foreground whitespace-pre-wrap">
                {customerData.remark}
              </span>
            </div>
          )}
        </div>

        <Separator className="my-3 flex-shrink-0" />

        {/* Tabs 区域 - 占据剩余空间并可滚动 */}
        <Tabs defaultValue="follow" className="flex-1 flex flex-col min-h-0">
          {/* TabsList 横向滚动 */}
          <div className="overflow-x-auto pb-2 -mb-2 scrollbar-hide">
            <TabsList className="flex w-max h-auto gap-1 bg-transparent p-0 justify-start mb-4">
              <TabsTrigger
                value="follow"
                className="text-xs sm:text-sm data-[state=active]:bg-muted px-3 py-1.5 whitespace-nowrap"
              >
                跟进记录
              </TabsTrigger>
              <TabsTrigger
                value="contacts"
                className="text-xs sm:text-sm data-[state=active]:bg-muted px-3 py-1.5 whitespace-nowrap"
              >
                联系人
              </TabsTrigger>
              <TabsTrigger
                value="contracts"
                className="text-xs sm:text-sm data-[state=active]:bg-muted px-3 py-1.5 whitespace-nowrap"
              >
                <ScrollText className="h-4 w-4 mr-1" />
                合同
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="text-xs sm:text-sm data-[state=active]:bg-muted px-3 py-1.5 whitespace-nowrap"
              >
                <CreditCard className="h-4 w-4 mr-1" />
                收款
              </TabsTrigger>
              <TabsTrigger
                value="invoices"
                className="text-xs sm:text-sm data-[state=active]:bg-muted px-3 py-1.5 whitespace-nowrap"
              >
                <Receipt className="h-4 w-4 mr-1" />
                发票
              </TabsTrigger>
              <TabsTrigger
                value="service-team"
                className="text-xs sm:text-sm data-[state=active]:bg-muted px-3 py-1.5 whitespace-nowrap"
              >
                <Users className="h-4 w-4 mr-1" />
                服务团队
              </TabsTrigger>
            </TabsList>
          </div>

          {/* TabsContent 容器 - 可滚动 */}
          <div className="flex-1 overflow-auto min-h-0">
            {/* 跟进记录 */}
            <TabsContent value="follow" className="mt-0 h-full">
              <CustomerFollowRecordsTab
                customerId={customerId}
                customerName={customerData.name}
              />
            </TabsContent>

            {/* 联系人 */}
            <TabsContent value="contacts" className="mt-0 h-full">
              <CustomerContactsTab customerId={customerId} />
            </TabsContent>

            {/* 合同 */}
            <TabsContent value="contracts" className="mt-0 h-full">
              <CustomerContractsTab
                customerId={customerId}
                customerName={customerData.name}
              />
            </TabsContent>

            {/* 收款 */}
            <TabsContent value="payments" className="mt-0 h-full">
              <CustomerPaymentsTab
                customerId={customerId}
                customerName={customerData.name}
              />
            </TabsContent>

            {/* 发票 */}
            <TabsContent value="invoices" className="mt-0 h-full">
              <CustomerInvoicesTab
                customerId={customerId}
                customerName={customerData.name}
              />
            </TabsContent>

            {/* 服务团队 */}
            <TabsContent value="service-team" className="mt-0 h-full">
              <CustomerServiceTeamTab customerId={customerId} />
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function getCustomerLevelLabel(level: string): string {
  const levels: Record<string, string> = {
    LEAD: "线索公司",
    PROSPECT: "意向客户",
    CUSTOMER: "正式客户",
    VIP: "VIP客户",
  };
  return levels[level] || "未知";
}

function getCustomerLevelVariant(
  level: string,
): "default" | "secondary" | "outline" | "destructive" {
  const variants: Record<
    string,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    LEAD: "secondary",
    PROSPECT: "outline",
    CUSTOMER: "default",
    VIP: "destructive",
  };
  return variants[level] || "secondary";
}
