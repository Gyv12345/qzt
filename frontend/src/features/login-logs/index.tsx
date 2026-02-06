import { Main } from "@/components/layout/main";
import { useTranslation } from "react-i18next";
import { LoginLogsTable } from "./login-logs-table";

export function LoginLogs() {
  const { t } = useTranslation();

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("settings.logs.loginLog.title")}
        </h1>
      </div>

      <LoginLogsTable />
    </Main>
  );
}
