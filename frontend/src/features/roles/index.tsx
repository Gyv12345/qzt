import { useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";
import { LanguageSwitch } from "@/components/language-switch";
import { ConfigDrawer } from "@/components/config-drawer";
import { RolesPrimaryButtons } from "./components/roles-primary-buttons";
import { RoleTable } from "./components/role-table";
import { RolesDialogs, useRolesDialogs } from "./components/roles-dialogs";

function RolesContent() {
  const { openCreateDialog, openEditDialog, openDeleteDialog } =
    useRolesDialogs();

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
            <h2 className="text-2xl font-bold tracking-tight">角色管理</h2>
            <p className="text-muted-foreground">管理系统角色和权限</p>
          </div>
          <RolesPrimaryButtons onCreate={openCreateDialog} />
        </div>
        <RoleTable onEdit={openEditDialog} onDelete={openDeleteDialog} />
      </Main>
    </>
  );
}

export function Roles() {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["roles"] });
  };

  return (
    <RolesDialogs onRefresh={handleRefresh}>
      <RolesContent />
    </RolesDialogs>
  );
}
