import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { UserCheck, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";

interface BatchAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerIds: string[];
  onSuccess: () => void;
}

export function BatchAssignDialog({
  open,
  onOpenChange,
  customerIds,
  onSuccess,
}: BatchAssignDialogProps) {
  const { t } = useTranslation();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUsersLoading, setIsUsersLoading] = useState(false);

  // 获取用户列表
  useEffect(() => {
    if (open) {
      fetchUsers();
    }
  }, [open]);

  const fetchUsers = async () => {
    setIsUsersLoading(true);
    try {
      const { usersControllerFindAll } = getScrmApi();
      const response = (await usersControllerFindAll({
        page: 1,
        pageSize: 100,
      })) as any;

      if (response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error("获取用户列表失败:", error);
      toast.error(t("customer.batchAssign.fetchUsersFailed"));
    } finally {
      setIsUsersLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast.error(t("customer.batchAssign.selectUserRequired"));
      return;
    }

    setIsAssigning(true);
    try {
      const { customerControllerBatchAssign } = getScrmApi();
      const response = (await customerControllerBatchAssign({
        customerIds,
        newFollowUserId: selectedUserId,
        reason: reason || t("customer.batchAssign.reason") || "批量分配",
      })) as any;

      toast.success(response.message || t("customer.batchAssign.success"));
      onSuccess();
      onOpenChange(false);
      // 重置表单
      setSelectedUserId("");
      setReason("");
    } catch (error: any) {
      toast.error(error.message || t("customer.batchAssign.failed"));
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            {t("customer.batchAssign.title")}
          </DialogTitle>
          <DialogDescription>
            {t("customer.batchAssign.description", {
              count: customerIds.length,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 选择跟进人 */}
          <div className="space-y-2">
            <Label htmlFor="follow-user">
              {t("customer.batchAssign.selectUser")}{" "}
              <span className="text-destructive">*</span>
            </Label>
            {isUsersLoading ? (
              <div className="flex items-center justify-center py-4 border rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {t("customer.batchAssign.loadingUsers")}
                </span>
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="follow-user">
                  <SelectValue
                    placeholder={t("customer.batchAssign.selectUser")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* 分配原因 */}
          <div className="space-y-2">
            <Label htmlFor="reason">{t("customer.batchAssign.reason")}</Label>
            <Textarea
              id="reason"
              placeholder={t("customer.batchAssign.reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* 提示信息 */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-700">
              <span className="font-medium">{t("common.tip")}：</span>
              {t("customer.batchAssign.hint")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isAssigning}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!selectedUserId || isAssigning}
          >
            {isAssigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t("customer.batchAssign.assigning")}
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                {t("customer.batchAssign.confirmAssign")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
