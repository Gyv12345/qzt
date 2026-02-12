import { Main } from "@/components/layout/main";
import { MenusTreeTable } from "./components/menus-tree-table";
import { MenusDialogs, useMenusDialogs } from "./components/menus-dialogs";

function MenusContent() {
  const { openEditDialog, openPermissionsDialog } = useMenusDialogs();

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">菜单管理</h1>
        <p className="text-muted-foreground">管理系统菜单结构和权限配置</p>
      </div>

      <MenusTreeTable
        onEdit={openEditDialog}
        onConfigurePermissions={openPermissionsDialog}
      />
    </Main>
  );
}

export function Menus() {
  const handleRefresh = () => {
    // 刷新逻辑由 MenusDialogs 处理
    window.location.reload();
  };

  return (
    <MenusDialogs onRefresh={handleRefresh}>
      <MenusContent />
    </MenusDialogs>
  );
}
