import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Main } from "@/components/layout/main";
import { InvoicesPrimaryButtons } from "./components/invoices-primary-buttons";
import { InvoicesTable } from "./components/invoices-table";
import {
  InvoicesDialogs,
  useInvoicesDialogs,
} from "./components/invoices-dialogs";
import { CustomerInvoicesTab } from "./components/customer-invoices-tab";
import type { NavigateFn } from "@/hooks/use-table-url-state";

const route = getRouteApi("/_authenticated/invoices");

function InvoicesContent() {
  const { t } = useTranslation();
  const search = route.useSearch();
  const routeNavigate = route.useNavigate();
  const queryClient = useQueryClient();
  const { openCreateDialog, openEditDialog } = useInvoicesDialogs();

  // 将 TanStack Router 的 navigate 适配为 NavigateFn
  const navigate = ((opts: any) => {
    routeNavigate({ search: opts.search as any });
  }) as NavigateFn;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  };

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("invoice.title")}
          </h2>
          <p className="text-muted-foreground">{t("invoice.description")}</p>
        </div>
        <InvoicesPrimaryButtons onCreate={openCreateDialog} />
      </div>
      <InvoicesTable
        search={search}
        navigate={navigate}
        onEdit={openEditDialog}
        onRefresh={handleRefresh}
      />
    </Main>
  );
}

export function Invoices() {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  };

  return (
    <InvoicesDialogs onRefresh={handleRefresh}>
      <InvoicesContent />
    </InvoicesDialogs>
  );
}

export { CustomerInvoicesTab };
