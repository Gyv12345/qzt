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
import { CustomerFollowRecordsTab } from "@/features/follow-records";
import { CustomerServiceTeamTab } from "@/features/service-teams";
import { CustomerContactsTab } from "@/features/contacts";
import { CustomerPaymentsTab } from "@/features/payments";
import { CustomerInvoicesTab } from "@/features/invoices";
import { useCustomer } from "../hooks/use-customers";
import type { Customer } from "../types/customer";
import {
  Phone,
  Mail,
  Building2,
  User,
  Users,
  FileText,
  CreditCard,
  Receipt,
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={drawerSide}
        className={isMobile ? "h-[85vh]" : "w-[800px] overflow-y-auto"}
      >
        <SheetHeader className="pb-4 text-start">
          <SheetTitle className="text-xl">{customerData.name}</SheetTitle>
          <SheetDescription>
            客户编号: {customerData.code || customerData.id}
          </SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        {/* 基本信息固定显示在顶部 */}
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <InfoItem
              icon={<User className="h-4 w-4" />}
              label="联系人"
              value={customerData.contactName || "-"}
            />
            <InfoItem
              icon={<Phone className="h-4 w-4" />}
              label="联系电话"
              value={customerData.contactPhone || "-"}
            />
            <InfoItem
              icon={<Mail className="h-4 w-4" />}
              label="邮箱"
              value={customerData.email || "-"}
            />
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">客户等级:</span>
              <Badge
                variant={getCustomerLevelVariant(customerData.customerLevel)}
                className="ml-auto"
              >
                {getCustomerLevelLabel(customerData.customerLevel)}
              </Badge>
            </div>
          </div>

          {customerData.address && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">地址:</span>
              <p className="text-sm">{customerData.address}</p>
            </div>
          )}

          {customerData.remark && (
            <div className="space-y-1">
              <span className="text-sm text-muted-foreground">备注:</span>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {customerData.remark}
              </p>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        {/* Tabs */}
        <Tabs defaultValue="follow" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-5 h-auto">
            <TabsTrigger value="follow" className="text-xs sm:text-sm">
              跟进记录
            </TabsTrigger>
            <TabsTrigger value="contacts" className="text-xs sm:text-sm">
              联系人
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs sm:text-sm">
              <CreditCard className="h-4 w-4 mr-1" />
              收款
            </TabsTrigger>
            <TabsTrigger value="invoices" className="text-xs sm:text-sm">
              <Receipt className="h-4 w-4 mr-1" />
              发票
            </TabsTrigger>
            <TabsTrigger value="service-team" className="text-xs sm:text-sm">
              <Users className="h-4 w-4 mr-1" />
              服务团队
            </TabsTrigger>
          </TabsList>

          {/* 跟进记录 */}
          <TabsContent
            value="follow"
            className="mt-4 overflow-auto max-h-[calc(85vh-400px)]"
          >
            <CustomerFollowRecordsTab
              customerId={customerId}
              customerName={customerData.name}
            />
          </TabsContent>

          {/* 联系人 */}
          <TabsContent
            value="contacts"
            className="mt-4 overflow-auto max-h-[calc(85vh-400px)]"
          >
            <CustomerContactsTab
              customerId={customerId}
              customerName={customerData.name}
            />
          </TabsContent>

          {/* 收款 */}
          <TabsContent
            value="payments"
            className="mt-4 overflow-auto max-h-[calc(85vh-400px)]"
          >
            <CustomerPaymentsTab
              customerId={customerId}
              customerName={customerData.name}
            />
          </TabsContent>

          {/* 发票 */}
          <TabsContent
            value="invoices"
            className="mt-4 overflow-auto max-h-[calc(85vh-400px)]"
          >
            <CustomerInvoicesTab
              customerId={customerId}
              customerName={customerData.name}
            />
          </TabsContent>

          {/* 服务团队 */}
          <TabsContent
            value="service-team"
            className="mt-4 overflow-auto max-h-[calc(85vh-400px)]"
          >
            <CustomerServiceTeamTab
              customerId={customerId}
              customerName={customerData.name}
            />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
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
