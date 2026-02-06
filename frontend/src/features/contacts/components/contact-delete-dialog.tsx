"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { Contact } from "../types/contact";
import { useDeleteContact } from "../hooks/use-contacts";

type ContactDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRow: Contact;
  onSuccess?: () => void;
};

export function ContactDeleteDialog({
  open,
  onOpenChange,
  currentRow,
  onSuccess,
}: ContactDeleteDialogProps) {
  const [value, setValue] = useState("");
  const deleteContact = useDeleteContact();

  const handleDelete = async () => {
    if (value.trim() !== currentRow.name) return;

    try {
      await deleteContact.mutateAsync(currentRow.id);
      setValue("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("删除失败:", error);
    }
  };

  // 对话框关闭时重置输入
  const handleOpenChange = (open: boolean) => {
    if (!open) setValue("");
    onOpenChange(open);
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== currentRow.name || deleteContact.isPending}
      title={
        <span className="text-destructive">
          <AlertTriangle
            className="me-1 inline-block stroke-destructive"
            size={18}
          />{" "}
          删除联系人
        </span>
      }
      desc={
        <div className="space-y-4">
          <p className="mb-2">
            确定要删除联系人 <strong>{currentRow.name}</strong> 吗？
            <br />
            此操作不可恢复，请谨慎操作。
          </p>

          <Label className="my-2">
            请输入联系人姓名以确认删除
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={currentRow.name}
            />
          </Label>

          <Alert variant="destructive">
            <AlertTitle>警告</AlertTitle>
            <AlertDescription>
              删除后，该联系人的所有相关信息将被永久删除，无法恢复。
            </AlertDescription>
          </Alert>
        </div>
      }
      confirmText="确认删除"
      destructive
    />
  );
}
