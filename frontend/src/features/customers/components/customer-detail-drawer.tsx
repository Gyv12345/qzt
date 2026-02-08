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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Globe,
  MapPin,
  Calendar,
  Tag,
  TrendingUp,
  Clock,
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
          <div className="grid gap-4 md:grid-cols-2">
            {/* 基本信息卡片 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  基本信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow label="公司名称" value={customerData.name} />
                <InfoRow label="公司简称" value={customerData.shortName} />
                <InfoRow label="公司编码" value={customerData.code} />
                <InfoRow label="行业" value={customerData.industry} />
                <InfoRow label="公司规模" value={customerData.scale} />
              </CardContent>
            </Card>

            {/* 联系方式卡片 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  联系方式
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow
                  label="公司地址"
                  value={customerData.address}
                  icon={<MapPin className="h-3 w-3" />}
                />
                <InfoRow
                  label="公司网站"
                  value={customerData.website}
                  icon={<Globe className="h-3 w-3" />}
                />
              </CardContent>
            </Card>

            {/* 客户信息卡片 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  客户信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    客户等级
                  </span>
                  <Badge
                    variant={getCustomerLevelVariant(
                      customerData.customerLevel,
                    )}
                  >
                    {getCustomerLevelLabel(customerData.customerLevel)}
                  </Badge>
                </div>
                <InfoRow label="来源渠道" value={customerData.sourceChannel} />
                <InfoRow
                  label="跟进人"
                  value={customerData.followUserName}
                  icon={<User className="h-3 w-3" />}
                />
                <InfoRow
                  label="状态"
                  value={customerData.status === 1 ? "启用" : "禁用"}
                />
              </CardContent>
            </Card>

            {/* 时间信息卡片 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  时间信息
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <InfoRow
                  label="首次联系"
                  value={
                    customerData.firstContactDate
                      ? format(
                          new Date(customerData.firstContactDate),
                          "yyyy-MM-dd",
                          { locale: zhCN },
                        )
                      : undefined
                  }
                  icon={<Calendar className="h-3 w-3" />}
                />
                <InfoRow
                  label="签约时间"
                  value={
                    customerData.contractDate
                      ? format(
                          new Date(customerData.contractDate),
                          "yyyy-MM-dd",
                          { locale: zhCN },
                        )
                      : undefined
                  }
                  icon={<TrendingUp className="h-3 w-3" />}
                />
              </CardContent>
            </Card>
          </div>

          {/* 备注卡片（全宽） */}
          {customerData.remark && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  备注
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {customerData.remark}
                </p>
              </CardContent>
            </Card>
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

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className="text-sm font-medium text-right truncate">
        {value || "-"}
      </span>
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
