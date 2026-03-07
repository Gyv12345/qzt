import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Main } from "@/components/layout/main";
import { UsersProvider } from "./components/users-provider";
import { UsersDrawers } from "./components/users-drawers";
import { UsersPrimaryButtons } from "./components/users-primary-buttons";
import { UsersTable } from "./components/users-table";

const route = getRouteApi("/_authenticated/users/");

export function Users() {
  const { t } = useTranslation();
  const search = route.useSearch();
  const navigate = route.useNavigate();

  return (
    <UsersProvider>
      <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {t("user.title")}
            </h2>
            <p className="text-muted-foreground">{t("user.description")}</p>
          </div>
          <UsersPrimaryButtons />
        </div>
        <UsersTable search={search} navigate={navigate} />
      </Main>

      <UsersDrawers />
    </UsersProvider>
  );
}
