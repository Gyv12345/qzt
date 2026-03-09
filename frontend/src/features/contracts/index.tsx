import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Main } from "@/components/layout/main";
import { ContractsPrimaryButtons } from "./components/contracts-primary-buttons";
import { ContractsTable } from "./components/contracts-table";
import {
  ContractsDialogs,
  useContractsDialogs,
} from "./components/contracts-dialogs";
import { CustomerContractsTab } from "./components/customer-contracts-tab";

const route = getRouteApi("/_authenticated/contracts");

function ContractsContent() {
  const { t } = useTranslation();
  const search = route.useSearch();
  const routerNavigate = route.useNavigate();
  const queryClient = useQueryClient();
  const { openCreateDialog, openEditDialog } = useContractsDialogs();

  // 将 TanStack Router 的 navigate 转换为 NavigateFn 类型
  const navigate: import("@/hooks/use-table-url-state").NavigateFn = (opts) => {
    routerNavigate({
      search: opts.search as any,
      replace: opts.replace,
    });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["contracts"] });
  };

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("contract.title")}
          </h2>
          <p className="text-muted-foreground">{t("contract.description")}</p>
        </div>
        <ContractsPrimaryButtons onCreate={openCreateDialog} />
      </div>
      <ContractsTable
        search={search}
        navigate={navigate}
        onEdit={openEditDialog}
        onRefresh={handleRefresh}
      />
    </Main>
  );
}

export function Contracts() {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["contracts"] });
  };

  return (
    <ContractsDialogs onRefresh={handleRefresh}>
      <ContractsContent />
    </ContractsDialogs>
  );
}

export { CustomerContractsTab };
