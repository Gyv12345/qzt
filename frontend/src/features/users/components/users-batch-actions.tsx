import { useState } from "react";
import { Trash2, Edit } from "lucide-react";
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
import { DepartmentTreeSelect } from "@/components/ui/department-tree-select";
import { useDepartments } from "@/features/departments/hooks/use-departments";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";

interface UsersBatchActionsProps {
  selectedIds: string[];
  onClearSelection: () => void;
  onSuccess: () => void;
}

export function UsersBatchActions({
  selectedIds,
  onClearSelection,
  onSuccess,
}: UsersBatchActionsProps) {
  const [isUpdateDrawerOpen, setIsUpdateDrawerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateDepartmentId, setUpdateDepartmentId] = useState<string>("");

  const { data: departmentsData } = useDepartments();
  const departments = departmentsData || [];

  const handleBatchUpdateDepartment = async () => {
    if (!updateDepartmentId) {
      toast.error("请选择部门");
      return;
    }

    setIsUpdating(true);
    try {
      // 循环调用更新接口（因为没有批量更新 API）
      for (const id of selectedIds) {
        await getScrmApi().usersControllerUpdate(id, {
          departmentId: updateDepartmentId,
        });
      }

      toast.success(`成功更新 ${selectedIds.length} 个用户的部门`);
      onSuccess();
      onClearSelection();
      setIsUpdateDrawerOpen(false);
      setUpdateDepartmentId("");
    } catch (error: any) {
      toast.error(error.message || "批量更新失败");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBatchDelete = async () => {
    setIsDeleting(true);
    try {
      // 循环调用删除接口
      for (const id of selectedIds) {
        await getScrmApi().usersControllerRemove(id);
      }

      toast.success(`成功删除 ${selectedIds.length} 个用户`);
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
            已选择 {selectedIds.length} 个用户
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
            onClick={() => setIsUpdateDrawerOpen(true)}
            className="h-8"
          >
            <Edit className="h-3.5 w-3.5 mr-1" />
            更新部门
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

      {/* 批量更新部门抽屉 */}
      <Sheet open={isUpdateDrawerOpen} onOpenChange={setIsUpdateDrawerOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>批量更新部门</SheetTitle>
            <SheetDescription>
              为 {selectedIds.length} 个用户设置部门
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 py-4 px-4">
            <div className="space-y-2">
              <Label htmlFor="batch-department">选择部门 *</Label>
              <DepartmentTreeSelect
                value={updateDepartmentId}
                onChange={(v) => setUpdateDepartmentId(v || "")}
                departments={departments}
                placeholder="请选择部门"
              />
            </div>
          </div>

          <SheetFooter className="px-4">
            <Button
              variant="outline"
              onClick={() => setIsUpdateDrawerOpen(false)}
            >
              取消
            </Button>
            <Button
              onClick={handleBatchUpdateDepartment}
              disabled={isUpdating || !updateDepartmentId}
            >
              {isUpdating ? "更新中..." : `更新 ${selectedIds.length} 个用户`}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* 批量删除确认对话框 */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除选中的 {selectedIds.length} 个用户吗？此操作无法撤销。
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
    </>
  );
}
