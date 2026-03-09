import { Main } from "@/components/layout/main";
import { MenusTreeTable } from "./components/menus-tree-table";
import { MenusDialogs, useMenusDialogs } from "./components/menus-dialogs";

function MenusContent() {
  const { openEditDialog, openCreateDialog } = useMenusDialogs();

  return (
    <Main className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">菜单管理</h1>
        <p className="text-muted-foreground">管理系统菜单结构和权限配置</p>
      </div>

      <MenusTreeTable onEdit={openEditDialog} onCreate={openCreateDialog} />
    </Main>
  );
}

export function Menus() {
  return (
    <MenusDialogs>
      <MenusContent />
    </MenusDialogs>
  );
}

// ========== 统一导出 ==========

// 导出组件
export { AppMenu } from "./components/app-menu";
export { MenuSkeleton, SidebarMenuSkeleton } from "./components/menu-skeleton";

// 导出 Hooks
export { useMenuTree, useFlatMenus } from "./hooks/use-menu-tree";
export type { MenuNode } from "./hooks/use-menu-tree";

// 导出工具函数
export {
  transformMenuGroups,
  flattenMenuGroups,
  findMenuItemByPath,
  isMenuItemActive,
} from "./lib/menu-transformer";

export { getIconComponent, getAvailableIconNames } from "./lib/icon-mapper";

// 导出类型
export type {
  MenuItem,
  MenuGroup,
  MenuTreeResponse,
  MenuInitializeResponse,
  NavItem,
  NavGroup,
} from "./types/menu";
