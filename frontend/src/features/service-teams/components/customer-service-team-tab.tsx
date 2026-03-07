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

// 角色配置（按顺序显示）
const ROLE_CONFIG = [
  { code: "SALE", label: "销售", variant: "default" as const },
  { code: "FINANCE", label: "财务", variant: "secondary" as const },
  { code: "OUTWORK", label: "外勤", variant: "outline" as const },
];

// API 返回的分组数据类型
interface GroupedServiceTeams {
  SALE: Array<{
    id: string;
    user?: { avatar?: string; realName?: string; username?: string };
    createdAt: string;
  }>;
  FINANCE: Array<{
    id: string;
    user?: { avatar?: string; realName?: string; username?: string };
    createdAt: string;
  }>;
  OUTWORK: Array<{
    id: string;
    user?: { avatar?: string; realName?: string; username?: string };
    createdAt: string;
  }>;
}

interface CustomerServiceTeamTabProps {
  customerId: string;
}

export function CustomerServiceTeamTab({
  customerId,
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

  const groupedTeams = (serviceTeamData || {}) as GroupedServiceTeams;

  // 将分组数据展平为成员列表，同时保留角色信息
  const allMembers = ROLE_CONFIG.flatMap((role) =>
    (
      (
        groupedTeams as unknown as Record<
          string,
          GroupedServiceTeams[keyof GroupedServiceTeams]
        >
      )[role.code] || []
    ).map((member) => ({
      ...member,
      roleLabel: role.label,
      roleVariant: role.variant,
    })),
  );

  // 检查是否有任何成员
  const hasMembers = allMembers.length > 0;

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
        ) : !hasMembers ? (
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
            {allMembers.map((member) => (
              <Card key={member.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={member.user?.avatar} />
                      <AvatarFallback>
                        {member.user?.realName?.[0] ||
                          member.user?.username?.[0] ||
                          "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {member.user?.realName || member.user?.username}
                        </span>
                        <Badge variant={member.roleVariant}>
                          {member.roleLabel}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        分配于{" "}
                        {format(new Date(member.createdAt), "yyyy-MM-dd", {
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
                      onClick={() => handleEdit(member)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteId(member.id)}
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
