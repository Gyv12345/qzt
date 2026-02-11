import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Main } from "@/components/layout/main";
import { PaymentsPrimaryButtons } from "./components/payments-primary-buttons";
import { PaymentsTable } from "./components/payments-table";
import {
  PaymentsDialogs,
  usePaymentsDialogs,
} from "./components/payments-dialogs";
import { CustomerPaymentsTab } from "./components/customer-payments-tab";
import type { NavigateFn } from "@/hooks/use-table-url-state";

const route = getRouteApi("/_authenticated/payments");

function PaymentsContent() {
  const { t } = useTranslation();
  const search = route.useSearch();
  const navigate = route.useNavigate() as unknown as NavigateFn;
  const queryClient = useQueryClient();
  const { openCreateDialog, openEditDialog } = usePaymentsDialogs();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  };

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("payment.title")}
          </h2>
          <p className="text-muted-foreground">{t("payment.description")}</p>
        </div>
        <PaymentsPrimaryButtons onCreate={openCreateDialog} />
      </div>
      <PaymentsTable
        search={search}
        navigate={navigate}
        onEdit={openEditDialog}
        onRefresh={handleRefresh}
      />
    </Main>
  );
}

export function Payments() {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["payments"] });
  };

  return (
    <PaymentsDialogs onRefresh={handleRefresh}>
      <PaymentsContent />
    </PaymentsDialogs>
  );
}

export { CustomerPaymentsTab };
