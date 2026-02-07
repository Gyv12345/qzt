import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FollowRecordInlineForm } from "./follow-record-inline-form";
import { FollowRecordsCompactTable } from "./follow-records-compact-table";
import { FollowRecordFormDialog } from "./follow-record-form-dialog";
import { followRecordsKeys } from "../hooks/use-follow-records";
import type { FollowRecordItem } from "../types/follow-record";

type CustomerFollowRecordsTabProps = {
  customerId: string;
  customerName?: string;
};

export function CustomerFollowRecordsTab({
  customerId,
  customerName,
}: CustomerFollowRecordsTabProps) {
  const queryClient = useQueryClient();
  const [editingRecord, setEditingRecord] = useState<
    FollowRecordItem | undefined
  >();

  const handleRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: followRecordsKeys.lists(),
    });
  };

  const handleEdit = useCallback((record: FollowRecordItem) => {
    setEditingRecord(record);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (window.confirm("确定要删除这条跟进记录吗？")) {
        try {
          const {
            useDeleteFollowRecord,
          } = require("../hooks/use-follow-records");
          const deleteMutation = useDeleteFollowRecord();
          await deleteMutation.mutateAsync(id);
          handleRefresh();
        } catch (error) {
          console.error("删除失败:", error);
        }
      }
    },
    [handleRefresh],
  );

  const handleDialogClose = () => {
    setEditingRecord(undefined);
  };

  return (
    <>
      <div className="space-y-4">
        <FollowRecordInlineForm
          customerId={customerId}
          customerName={customerName}
          onSuccess={handleRefresh}
        />
        <FollowRecordsCompactTable
          customerId={customerId}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      <FollowRecordFormDialog
        open={!!editingRecord}
        onOpenChange={handleDialogClose}
        customerId={customerId}
        customerName={customerName}
        record={editingRecord}
        onSuccess={handleRefresh}
      />
    </>
  );
}
