import { useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Plus, Edit2, Trash2, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCustomerServiceTeam,
  useDeleteServiceTeam,
} from "../hooks/use-service-teams";
import { ServiceTeamFormDrawer } from "./service-team-form-drawer";

// 角色显示映射
const ROLE_LABELS: Record<string, string> = {
  SALE: "销售",
  FINANCE: "财务",
  OUTWORK: "外勤",
};

// 角色颜色映射
const ROLE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  SALE: "default",
  FINANCE: "secondary",
  OUTWORK: "outline",
};

interface CustomerServiceTeamTabProps {
  customerId: string;
  customerName: string;
}

export function CustomerServiceTeamTab({
  customerId,
  customerName,
}: CustomerServiceTeamTabProps) {
  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: serviceTeamData, isLoading } =
    useCustomerServiceTeam(customerId);
  const deleteMutation = useDeleteServiceTeam();

  // 处理编辑
  const handleEdit = (record: any) => {
    setEditingRecord(record);
    setFormOpen(true);
  };

  // 处理删除
  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  // 处理添加
  const handleAdd = () => {
    setEditingRecord(null);
    setFormOpen(true);
  };

  // 关闭表单
  const handleFormClose = () => {
    setFormOpen(false);
    setEditingRecord(null);
  };

  const serviceTeams = serviceTeamData || [];

  return (
    <>
      <div className="space-y-4">
        {/* 操作栏 */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">服务团队成员</h3>
          <Button size="sm" onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-1" />
            添加成员
          </Button>
        </div>

        {/* 加载状态 */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : serviceTeams.length === 0 ? (
          /* 空状态 */
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">暂无服务团队成员</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={handleAdd}
              >
                <Plus className="h-4 w-4 mr-1" />
                添加第一个成员
              </Button>
            </CardContent>
          </Card>
        ) : (
          /* 成员列表 */
          <div className="space-y-2">
            {serviceTeams.map((team: any) => (
              <Card key={team.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={team.user?.avatar} />
                      <AvatarFallback>
                        {team.user?.realName?.[0] ||
                          team.user?.username?.[0] ||
                          "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {team.user?.realName || team.user?.username}
                        </span>
                        <Badge
                          variant={ROLE_VARIANTS[team.roleCode] || "outline"}
                        >
                          {ROLE_LABELS[team.roleCode] || team.roleCode}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        分配于{" "}
                        {format(new Date(team.createdAt), "yyyy-MM-dd", {
                          locale: zhCN,
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(team)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteId(team.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 表单抽屉 */}
      <ServiceTeamFormDrawer
        open={formOpen}
        onOpenChange={handleFormClose}
        editingRecord={editingRecord}
        customerId={customerId}
        onSuccess={() => {
          handleFormClose();
          window.location.reload();
        }}
      />

      {/* 删除确认对话框 */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除该服务团队成员吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
