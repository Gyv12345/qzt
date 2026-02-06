"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { UserEntity } from "@/models";
import { useDeleteUser } from "../hooks/use-users";

type UserDeleteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRow: UserEntity;
};

export function UsersDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: UserDeleteDialogProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const deleteUser = useDeleteUser();

  const handleDelete = async () => {
    if (value.trim() !== currentRow.username) return;

    try {
      await deleteUser.mutateAsync(currentRow.id);
      setValue("");
      onOpenChange(false);
    } catch (error) {
      console.error("删除失败:", error);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      handleConfirm={handleDelete}
      disabled={value.trim() !== currentRow.username}
      title={
        <span className="text-destructive">
          <AlertTriangle
            className="me-1 inline-block stroke-destructive"
            size={18}
          />{" "}
          {t("user.delete.title")}
        </span>
      }
      desc={
        <div className="space-y-4">
          <p className="mb-2">
            {t("user.delete.description", { username: currentRow.username })}
            <br />
            {t("user.delete.description2", {
              role: currentRow.roles?.[0]?.role?.code || "N/A",
            })}
          </p>

          <Label className="my-2">
            {t("user.delete.usernameLabel")}
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t("user.delete.usernamePlaceholder")}
            />
          </Label>

          <Alert variant="destructive">
            <AlertTitle>{t("user.delete.warning")}</AlertTitle>
            <AlertDescription>{t("user.delete.warningText")}</AlertDescription>
          </Alert>
        </div>
      }
      confirmText={t("user.delete.confirmButton")}
      destructive
    />
  );
}
