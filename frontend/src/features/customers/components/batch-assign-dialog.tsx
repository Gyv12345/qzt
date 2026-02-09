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
  const [isLoading, setIsLoading] = useState(false);
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
      const { userControllerFindAll } = getScrmApi();
      const response = (await userControllerFindAll({
        page: 1,
        pageSize: 100,
      })) as any;

      if (response.data) {
        setUsers(response.data);
      }
    } catch (error) {
      console.error("获取用户列表失败:", error);
      toast.error("获取用户列表失败");
    } finally {
      setIsUsersLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedUserId) {
      toast.error("请选择跟进人");
      return;
    }

    setIsAssigning(true);
    try {
      const { customerControllerBatchAssign } = getScrmApi();
      const response = (await customerControllerBatchAssign({
        customerIds,
        newFollowUserId: selectedUserId,
        reason: reason || "批量分配",
      })) as any;

      toast.success(response.message || "批量分配成功");
      onSuccess();
      onOpenChange(false);
      // 重置表单
      setSelectedUserId("");
      setReason("");
    } catch (error: any) {
      toast.error(error.message || "批量分配失败");
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
            批量分配跟进人
          </DialogTitle>
          <DialogDescription>
            将选中的 {customerIds.length} 个客户分配给指定的跟进人
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 选择跟进人 */}
          <div className="space-y-2">
            <Label htmlFor="follow-user">
              跟进人 <span className="text-destructive">*</span>
            </Label>
            {isUsersLoading ? (
              <div className="flex items-center justify-center py-4 border rounded-lg">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  加载用户列表...
                </span>
              </div>
            ) : (
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="follow-user">
                  <SelectValue placeholder="请选择跟进人" />
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
            <Label htmlFor="reason">分配原因</Label>
            <Textarea
              id="reason"
              placeholder="请输入分配原因（选填）"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* 提示信息 */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-sm text-blue-700">
              <span className="font-medium">提示：</span>
              分配后，原跟进人将无法继续管理这些客户。分配历史将被记录。
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
            取消
          </Button>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={!selectedUserId || isAssigning}
          >
            {isAssigning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                分配中...
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4 mr-2" />
                确认分配
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
