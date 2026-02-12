/**
 * 菜单模块统一导出
 */

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
