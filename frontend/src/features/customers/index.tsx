import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Main } from "@/components/layout/main";
import { CustomersPrimaryButtons } from "./components/customers-primary-buttons";
import { CustomersTable } from "./components/customers-table";
import { CustomerStatisticsPanel } from "./components/customer-statistics-panel";
import {
  CustomersDialogs,
  useCustomersDialogs,
} from "./components/customers-dialogs";
import type { Customer } from "./types/customer";
import type { NavigateFn } from "@/hooks/use-table-url-state";

const route = getRouteApi("/_authenticated/customers");

function CustomersContent() {
  const { t } = useTranslation();
  const search = route.useSearch();
  const routerNavigate = route.useNavigate();
  const queryClient = useQueryClient();
  const {
    openCreateDialog,
    openEditDialog,
    openDetailDialog,
    openImportDialog,
    openExportDialog,
  } = useCustomersDialogs();

  // 将 TanStack Router 的 navigate 转换为 NavigateFn 类型
  const navigate: NavigateFn = (opts) => {
    routerNavigate({
      search: opts.search === true ? (prev) => prev : (opts.search as any),
    });
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  const handleRowClick = (customer: Customer) => {
    openDetailDialog(customer.id);
  };

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("customer.title")}
          </h2>
          <p className="text-muted-foreground">{t("customer.description")}</p>
        </div>
        <CustomersPrimaryButtons
          onCreate={openCreateDialog}
          onImport={openImportDialog}
          onExport={openExportDialog}
        />
      </div>

      <CustomersTable
        search={search}
        navigate={navigate}
        onEdit={openEditDialog}
        onRefresh={handleRefresh}
        onRowClick={handleRowClick}
      />

      {/* 统计面板 */}
      <CustomerStatisticsPanel />
    </Main>
  );
}

export function Customers() {
  const queryClient = useQueryClient();
  const search = route.useSearch();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["customers"] });
  };

  // 提取当前筛选条件用于导出
  const currentFilters = {
    keyword: search.name as string | undefined,
    customerLevel: search.customerLevel?.join(",") as string | undefined,
  };

  return (
    <CustomersDialogs onRefresh={handleRefresh} currentFilters={currentFilters}>
      <CustomersContent />
    </CustomersDialogs>
  );
}
