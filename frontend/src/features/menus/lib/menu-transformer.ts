/**
 * 菜单数据转换工具
 * 将后端返回的菜单数据转换为前端组件可用的格式
 */

import type { MenuGroup, MenuItem } from "../types/menu";
import type {
  NavGroup,
  NavItem,
  NavLink,
  NavCollapsible,
} from "@/components/layout/types";
import { getIconComponent } from "./icon-mapper";

/**
 * 将后端返回的 MenuGroup[] 转换为前端 NavGroup[]
 *
 * @param menuGroups - 后端返回的菜单分组数据
 * @returns 前端 NavGroup 格式
 *
 * @example
 * ```tsx
 * const navGroups = transformMenuGroups(backendMenuData);
 * return navGroups.map(group => <NavGroup key={group.title} {...group} />);
 * ```
 */
export function transformMenuGroups(menuGroups: MenuGroup[]): NavGroup[] {
  if (!menuGroups || menuGroups.length === 0) {
    return [];
  }

  return menuGroups.map((group) => ({
    title: group.title,
    items: group.items.map(transformMenuItem),
  }));
}

/**
 * 将后端返回的 MenuItem 转换为前端 NavItem (NavLink | NavCollapsible)
 *
 * @param item - 后端菜单项
 * @returns 前端 NavItem 格式 (NavLink 或 NavCollapsible)
 */
function transformMenuItem(item: MenuItem): NavItem {
  const icon = getIconComponent(item.icon);

  // 如果有子菜单，返回 NavCollapsible 类型
  if (item.children && item.children.length > 0) {
    // 子菜单项必须是 NavLink（必须有 url）
    const subItems = item.children.map((child) => {
      const subLink: NavLink = {
        title: child.title,
        url: child.path,
        icon: getIconComponent(child.icon),
      };

      // 如果有徽章数据，添加徽章
      if (child.badge) {
        subLink.badge =
          typeof child.badge === "number" ? String(child.badge) : child.badge;
      }

      return subLink;
    });

    const collapsible: NavCollapsible = {
      title: item.title,
      icon,
      items: subItems,
    };

    // 如果有徽章数据，添加徽章
    if (item.badge) {
      collapsible.badge =
        typeof item.badge === "number" ? String(item.badge) : item.badge;
    }

    return collapsible;
  }

  // 没有子菜单，返回 NavLink 类型
  const link: NavLink = {
    title: item.title,
    url: item.path,
    icon,
  };

  // 如果有徽章数据，添加徽章
  if (item.badge) {
    link.badge =
      typeof item.badge === "number" ? String(item.badge) : item.badge;
  }

  return link;
}

/**
 * 展平菜单树为一维数组（用于搜索）
 *
 * @param menuGroups - 菜单分组数据
 * @returns 展平的菜单项数组
 *
 * @example
 * ```ts
 * const flatMenus = flattenMenuGroups(menuGroups);
 * // 返回: [{ title: "客户管理", url: "/customers", ... }, ...]
 * ```
 */
export function flattenMenuGroups(
  menuGroups: MenuGroup[],
): Omit<MenuItem, "children">[] {
  const result: Omit<MenuItem, "children">[] = [];

  function traverse(items: MenuItem[]) {
    for (const item of items) {
      // 提取当前项（不包含 children）
      const { children, ...itemWithoutChildren } = item;
      result.push(itemWithoutChildren);

      // 如果有子项，递归遍历
      if (children && children.length > 0) {
        traverse(children);
      }
    }
  }

  for (const group of menuGroups) {
    traverse(group.items);
  }

  return result;
}

/**
 * 根据路径查找菜单项
 *
 * @param menuGroups - 菜单分组数据
 * @param path - 要查找的路径
 * @returns 匹配的菜单项，如果未找到则返回 undefined
 */
export function findMenuItemByPath(
  menuGroups: MenuGroup[],
  path: string,
): MenuItem | undefined {
  const flatMenus = flattenMenuGroups(menuGroups);
  return flatMenus.find((item) => item.path === path);
}

/**
 * 检查路径是否匹配菜单项（用于高亮当前菜单）
 * 支持完全匹配、忽略查询参数匹配、子路径匹配
 *
 * @param currentPath - 当前路径
 * @param menuItem - 菜单项
 * @returns 是否匹配
 */
export function isMenuItemActive(
  currentPath: string,
  menuItem: MenuItem,
): boolean {
  // 完全匹配
  if (currentPath === menuItem.path) {
    return true;
  }

  // 忽略查询参数匹配
  if (currentPath.split("?")[0] === menuItem.path) {
    return true;
  }

  // 如果有子菜单，检查是否匹配任意子项
  if (menuItem.children && menuItem.children.length > 0) {
    return menuItem.children.some((child) =>
      isMenuItemActive(currentPath, child),
    );
  }

  return false;
}
