import { getRouteApi } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Main } from "@/components/layout/main";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ContactsPrimaryButtons } from "./components/contacts-primary-buttons";
import { ContactsTable } from "./components/contacts-table";
import {
  ContactsDialogs,
  useContactsDialogs,
} from "./components/contacts-dialogs";
import { CustomerContactsTab } from "./components/customer-contacts-tab";
import type { Contact } from "./types/contact";

const route = getRouteApi("/_authenticated/contacts");

function ContactsContent() {
  const { t } = useTranslation();
  const search = route.useSearch();
  const routerNavigate = route.useNavigate();
  const queryClient = useQueryClient();
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);

  // 将 TanStack Router 的 navigate 转换为 NavigateFn 类型
  const navigate: import("@/hooks/use-table-url-state").NavigateFn = (opts) => {
    routerNavigate({
      search: opts.search as any,
      replace: opts.replace,
    });
  };
  const {
    openCreateDialog,
    openEditDialog,
    openDeleteDialog,
    openDetailDrawer,
    openLinkCustomerDialog,
    openCreateCustomerDialog,
  } = useContactsDialogs();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
  };

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            {t("contact.title")}
          </h2>
          <p className="text-muted-foreground">{t("contact.description")}</p>
        </div>
        <ContactsPrimaryButtons
          onCreate={openCreateDialog}
          onImportSuccess={handleRefresh}
          selectedData={selectedContacts}
        />
      </div>
      <ContactsTable
        search={search}
        navigate={navigate}
        onEdit={openEditDialog}
        onDelete={openDeleteDialog}
        onOpenDetail={openDetailDrawer}
        onSelectionChange={setSelectedContacts}
        onRefresh={handleRefresh}
        onLinkCustomer={openLinkCustomerDialog}
        onCreateCustomer={openCreateCustomerDialog}
      />
    </Main>
  );
}

export function Contacts() {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
  };

  return (
    <ContactsDialogs onRefresh={handleRefresh}>
      <ContactsContent />
    </ContactsDialogs>
  );
}

export { CustomerContactsTab };
