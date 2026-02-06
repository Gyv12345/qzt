import { Main } from "@/components/layout/main";
import { useTranslation } from "react-i18next";
import { OperationLogsTable } from "./operation-logs-table";

export function OperationLogs() {
  const { t } = useTranslation();

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("settings.logs.operationLog.title")}
        </h1>
      </div>

      <OperationLogsTable />
    </Main>
  );
}
