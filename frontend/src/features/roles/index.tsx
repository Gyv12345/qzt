import { useQueryClient } from "@tanstack/react-query";
import { Main } from "@/components/layout/main";
import { RolesPrimaryButtons } from "./components/roles-primary-buttons";
import { RoleTable } from "./components/role-table";
import { RolesDialogs, useRolesDialogs } from "./components/roles-dialogs";

function RolesContent() {
  const { openCreateDialog, openEditDialog, openDeleteDialog } =
    useRolesDialogs();

  return (
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
