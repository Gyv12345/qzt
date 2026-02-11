import { useState } from "react";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  LoaderCircle,
  Building2,
} from "lucide-react";
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
  useServiceTeams,
  useDeleteServiceTeam,
} from "../hooks/use-service-teams";

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

interface ServiceTeamsTableProps {
  onEdit?: (record: any) => void;
}

export function ServiceTeamsTable({ onEdit }: ServiceTeamsTableProps) {
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(
    new Set(),
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    data: serviceTeamsData,
    isLoading,
    refetch,
  } = useServiceTeams({
    page: 1,
    pageSize: 1000,
  });
  const deleteMutation = useDeleteServiceTeam();

  // 按客户分组
  const groupedByCustomer = (serviceTeamsData?.data || []).reduce(
    (acc: Record<string, any[]>, item: any) => {
      const customerId = item.customerId;
      if (!acc[customerId]) {
        acc[customerId] = [];
      }
      acc[customerId].push(item);
      return acc;
    },
    {},
  );

  // 切换展开状态
  const toggleExpand = (customerId: string) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerId)) {
      newExpanded.delete(customerId);
    } else {
      newExpanded.add(customerId);
    }
    setExpandedCustomers(newExpanded);
  };

  // 处理编辑
  const handleEdit = (record: any) => {
    if (onEdit) {
      onEdit(record);
    }
  };

  // 处理删除
  const handleDelete = async () => {
    if (deleteId) {
      await deleteMutation.mutateAsync(deleteId);
      setDeleteId(null);
      refetch();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-16">
          <LoaderCircle className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const customerIds = Object.keys(groupedByCustomer);

  if (customerIds.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">暂无服务团队分配记录</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {customerIds.map((customerId) => {
          const teams = groupedByCustomer[customerId];
          const firstTeam = teams[0];
          const isExpanded = expandedCustomers.has(customerId);

          return (
            <Card key={customerId}>
              <CardContent className="p-0">
                {/* 客户分组标题 */}
                <div
                  className="flex items-center gap-2 p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpand(customerId)}
                >
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {firstTeam.customer?.name || `客户 ${customerId}`}
                  </span>
                  <Badge variant="outline" className="ml-2">
                    {teams.length} 名成员
                  </Badge>
                </div>

                {/* 服务团队成员列表 */}
                {isExpanded && (
                  <div className="divide-y">
                    {teams.map((team) => (
                      <div
                        key={team.id}
                        className="flex items-center justify-between p-4 hover:bg-muted/30"
                      >
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
                                variant={
                                  ROLE_VARIANTS[team.roleCode] || "outline"
                                }
                              >
                                {ROLE_LABELS[team.roleCode] || team.roleCode}
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              分配于{" "}
                              {format(
                                new Date(team.createdAt),
                                "yyyy-MM-dd HH:mm",
                                {
                                  locale: zhCN,
                                },
                              )}
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
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

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
