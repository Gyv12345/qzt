import { useState } from "react";
import { Trash2, Edit, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import { BatchUpdateDrawer } from "./batch-update-drawer";
import { BatchAssignDialog } from "./batch-assign-dialog";

interface CustomersBatchActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onSuccess: () => void;
}

export function CustomersBatchActions({
  selectedIds,
  onClearSelection,
  onSuccess,
}: CustomersBatchActionsProps) {
  const [isUpdateDrawerOpen, setIsUpdateDrawerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleBatchUpdate = () => {
    setIsUpdateDrawerOpen(true);
  };

  const handleBatchDelete = async () => {
    setIsDeleting(true);
    try {
      const { customerControllerBatchDelete } = getScrmApi();
      const response = (await customerControllerBatchDelete({
        customerIds: selectedIds,
      })) as any;

      toast.success(response.message || "批量删除成功");
      onSuccess();
      onClearSelection();
    } catch (error: any) {
      toast.error(error.message || "批量删除失败");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <>
      {/* 批量操作栏 */}
      <div className="flex items-center justify-between bg-primary/10 px-4 py-2 rounded-lg mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            已选择 {selectedIds.length} 个客户
          </span>
          <button
            onClick={onClearSelection}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            取消选择
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleBatchUpdate}
            className="h-8"
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            批量更新
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAssignDialogOpen(true)}
            className="h-8"
          >
            <UserCheck className="h-3.5 w-3.5 mr-1" />
            批量分配
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="h-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            批量删除
          </Button>
        </div>
      </div>

      {/* 批量更新抽屉 */}
      <BatchUpdateDrawer
        open={isUpdateDrawerOpen}
        onOpenChange={(open) => {
          setIsUpdateDrawerOpen(open);
          if (!open) onClearSelection();
        }}
        customerIds={selectedIds}
        onSuccess={() => {
          onSuccess();
          onClearSelection();
        }}
      />

      {/* 批量删除确认对话框 */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除选中的 {selectedIds.length} 个客户吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 批量分配对话框 */}
      <BatchAssignDialog
        open={isAssignDialogOpen}
        onOpenChange={(open) => {
          setIsAssignDialogOpen(open);
          if (!open) onClearSelection();
        }}
        customerIds={selectedIds}
        onSuccess={() => {
          onSuccess();
          onClearSelection();
        }}
      />
    </>
  );
}
