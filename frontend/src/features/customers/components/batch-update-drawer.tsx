import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";

interface BatchUpdateDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerIds: string[];
  onSuccess: () => void;
}

export function BatchUpdateDrawer({
  open,
  onOpenChange,
  customerIds,
  onSuccess,
}: BatchUpdateDrawerProps) {
  const { t } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 表单状态
  const [updateLevel, setUpdateLevel] = useState(false);
  const [customerLevel, setCustomerLevel] = useState<string>("");
  const [updateFollowUser, setUpdateFollowUser] = useState(false);
  const [followUserId, setFollowUserId] = useState<string>("");
  const [updateSourceChannel, setUpdateSourceChannel] = useState(false);
  const [sourceChannel, setSourceChannel] = useState<string>("");
  const [updateIndustry, setUpdateIndustry] = useState(false);
  const [industry, setIndustry] = useState<string>("");

  const handleSubmit = async () => {
    // 至少选择一个更新项
    if (
      !updateLevel &&
      !updateFollowUser &&
      !updateSourceChannel &&
      !updateIndustry
    ) {
      toast.error("请至少选择一个更新项");
      return;
    }

    // 构建更新数据
    const updateData: any = {};
    if (updateLevel && customerLevel) {
      updateData.customerLevel = customerLevel;
    }
    if (updateFollowUser && followUserId) {
      updateData.followUserId = followUserId;
    }
    if (updateSourceChannel && sourceChannel) {
      updateData.sourceChannel = sourceChannel;
    }
    if (updateIndustry && industry) {
      updateData.industry = industry;
    }

    setIsSubmitting(true);
    try {
      const { customerControllerBatchUpdate } = getScrmApi();
      const response = (await customerControllerBatchUpdate({
        customerIds,
        ...updateData,
      })) as any;

      toast.success(response.message || "批量更新成功");
      onSuccess();
      onOpenChange(false);
      handleReset();
    } catch (error: any) {
      toast.error(error.message || "批量更新失败");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setUpdateLevel(false);
    setCustomerLevel("");
    setUpdateFollowUser(false);
    setFollowUserId("");
    setUpdateSourceChannel(false);
    setSourceChannel("");
    setUpdateIndustry(false);
    setIndustry("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>批量更新客户</SheetTitle>
          <SheetDescription>
            已选择 {customerIds.length} 个客户，选择要更新的字段
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4 max-h-[60vh] overflow-auto px-4">
          {/* 客户等级 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update-level"
                checked={updateLevel}
                onCheckedChange={(checked) =>
                  setUpdateLevel(checked as boolean)
                }
              />
              <Label htmlFor="update-level">客户等级</Label>
            </div>
            {updateLevel && (
              <Select value={customerLevel} onValueChange={setCustomerLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="选择客户等级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LEAD">
                    {t("customer.levels.LEAD")}
                  </SelectItem>
                  <SelectItem value="PROSPECT">
                    {t("customer.levels.PROSPECT")}
                  </SelectItem>
                  <SelectItem value="CUSTOMER">
                    {t("customer.levels.CUSTOMER")}
                  </SelectItem>
                  <SelectItem value="VIP">
                    {t("customer.levels.VIP")}
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 跟进人 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update-follow-user"
                checked={updateFollowUser}
                onCheckedChange={(checked) =>
                  setUpdateFollowUser(checked as boolean)
                }
              />
              <Label htmlFor="update-follow-user">跟进人</Label>
            </div>
            {updateFollowUser && (
              <Input
                placeholder="输入跟进人ID"
                value={followUserId}
                onChange={(e) => setFollowUserId(e.target.value)}
              />
            )}
          </div>

          {/* 来源渠道 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update-source-channel"
                checked={updateSourceChannel}
                onCheckedChange={(checked) =>
                  setUpdateSourceChannel(checked as boolean)
                }
              />
              <Label htmlFor="update-source-channel">来源渠道</Label>
            </div>
            {updateSourceChannel && (
              <Input
                placeholder="输入来源渠道"
                value={sourceChannel}
                onChange={(e) => setSourceChannel(e.target.value)}
              />
            )}
          </div>

          {/* 行业 */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="update-industry"
                checked={updateIndustry}
                onCheckedChange={(checked) =>
                  setUpdateIndustry(checked as boolean)
                }
              />
              <Label htmlFor="update-industry">行业</Label>
            </div>
            {updateIndustry && (
              <Input
                placeholder="输入行业"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              />
            )}
          </div>
        </div>

        <SheetFooter className="px-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "更新中..." : `更新 ${customerIds.length} 个客户`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
