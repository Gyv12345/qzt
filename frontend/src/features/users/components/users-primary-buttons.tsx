import { FileUp, UserPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useUsers } from "./users-provider";

export function UsersPrimaryButtons() {
  const { t } = useTranslation();
  const { setOpen } = useUsers();
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        className="space-x-1"
        onClick={() => setOpen("batchAdd")}
      >
        <span>{t("user.batchAdd") || "批量添加"}</span> <FileUp size={18} />
      </Button>
      <Button className="space-x-1" onClick={() => setOpen("add")}>
        <span>{t("user.addNew")}</span> <UserPlus size={18} />
      </Button>
    </div>
  );
}
