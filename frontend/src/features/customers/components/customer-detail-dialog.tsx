import { useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FollowRecords } from "@/features/follow-records";
import { CustomerServiceTeamTab } from "@/features/service-teams";
import { useCustomer } from "../hooks/use-customers";
import type { Customer } from "../types/customer";
import { Phone, Mail, Building2, User, Users } from "lucide-react";

type CustomerDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
};

export function CustomerDetailDialog({
  open,
  onOpenChange,
  customerId,
}: CustomerDetailDialogProps) {
  const { data: customer, isLoading } = useCustomer(customerId);

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px]">
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!customer) {
    return null;
  }

  const customerData = customer as any;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-xl">{customerData.name}</DialogTitle>
          <DialogDescription>
            客户编号: {customerData.code || customerData.id}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">基本信息</TabsTrigger>
            <TabsTrigger value="follow">跟进记录</TabsTrigger>
            <TabsTrigger value="service-team">
              <Users className="h-4 w-4 mr-1" />
              服务团队
            </TabsTrigger>
            <TabsTrigger value="contracts">合同</TabsTrigger>
          </TabsList>

          {/* 基本信息 */}
          <TabsContent
            value="info"
            className="mt-4 space-y-4 overflow-auto max-h-[60vh]"
          >
            <div className="grid grid-cols-2 gap-4">
              <InfoItem
                icon={<Building2 className="h-4 w-4" />}
                label="企业名称"
                value={customerData.name}
              />
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
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">客户等级</h4>
              <Badge
                variant={getCustomerLevelVariant(customerData.customerLevel)}
              >
                {getCustomerLevelLabel(customerData.customerLevel)}
              </Badge>
            </div>

            {customerData.address && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">地址</h4>
                <p className="text-sm text-muted-foreground">
                  {customerData.address}
                </p>
              </div>
            )}

            {customerData.remark && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">备注</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {customerData.remark}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                创建时间:{" "}
                {format(new Date(customerData.createdAt), "yyyy-MM-dd HH:mm", {
                  locale: zhCN,
                })}
              </div>
              <div>
                更新时间:{" "}
                {format(new Date(customerData.updatedAt), "yyyy-MM-dd HH:mm", {
                  locale: zhCN,
                })}
              </div>
            </div>
          </TabsContent>

          {/* 跟进记录 */}
          <TabsContent value="follow" className="mt-0">
            <FollowRecords
              customerId={customerId}
              customerName={customerData.name}
            />
          </TabsContent>

          {/* 服务团队 */}
          <TabsContent value="service-team" className="mt-4">
            <CustomerServiceTeamTab
              customerId={customerId}
              customerName={customerData.name}
            />
          </TabsContent>

          {/* 合同 */}
          <TabsContent value="contracts" className="mt-4">
            <div className="text-center py-8 text-muted-foreground">
              合同列表待开发
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
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
