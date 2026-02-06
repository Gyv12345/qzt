import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";
import { LanguageSwitch } from "@/components/language-switch";
import { ConfigDrawer } from "@/components/config-drawer";
import { InvoicesPrimaryButtons } from "./components/invoices-primary-buttons";
import { InvoicesTable } from "./components/invoices-table";
import {
  InvoicesDialogs,
  useInvoicesDialogs,
} from "./components/invoices-dialogs";

const route = getRouteApi("/_authenticated/invoices");

function InvoicesContent() {
  const { t } = useTranslation();
  const search = route.useSearch();
  const navigate = route.useNavigate();
  const queryClient = useQueryClient();
  const { openCreateDialog, openEditDialog } = useInvoicesDialogs();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["invoices"] });
  };

  return (
    <>
      <Header fixed>
        <Search />
        <div className="ms-auto flex items-center space-x-4">
          <ThemeSwitch />
          <LanguageSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

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
    </>
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
