import { useState, useCallback } from "react";
import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Main } from "@/components/layout/main";
import { Button } from "@/components/ui/button";
import { FollowRecordsTable } from "./components/follow-records-table";
import { FollowRecordFormDialog } from "./components/follow-record-form-dialog";
import { useDeleteFollowRecord } from "./hooks/use-follow-records";
import { followRecordsKeys } from "./hooks/use-follow-records";
import type { FollowRecordItem } from "./types/follow-record";
import { CustomerFollowRecordsTab } from "./components/customer-follow-records-tab";

type FollowRecordsProps = {
  customerId: string;
  customerName?: string;
};

export function FollowRecords({
  customerId,
  customerName,
}: FollowRecordsProps) {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<
    FollowRecordItem | undefined
  >();

  const deleteMutation = useDeleteFollowRecord();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: followRecordsKeys.lists(),
    });
  };

  const handleCreate = () => {
    setEditingRecord(undefined);
    setDialogOpen(true);
  };

  const handleEdit = useCallback((record: FollowRecordItem) => {
    setEditingRecord(record);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (window.confirm("确定要删除这条跟进记录吗？")) {
        try {
          await deleteMutation.mutateAsync(id);
          handleRefresh();
        } catch (error) {
          console.error("删除失败:", error);
        }
      }
    },
    [deleteMutation],
  );

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingRecord(undefined);
  };

  return (
    <>
      <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
        {/* 页面头部：标题 + 新建按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">跟进记录</h2>
            {customerName && (
              <span className="text-sm text-muted-foreground">
                - {customerName}
              </span>
            )}
          </div>
          <Button onClick={handleCreate} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            新建跟进
          </Button>
        </div>
        <FollowRecordsTable
          customerId={customerId}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </Main>

      <FollowRecordFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        customerId={customerId}
        customerName={customerName}
        record={editingRecord}
        onSuccess={handleRefresh}
      />
    </>
  );
}

export { CustomerFollowRecordsTab };
