/**
 * 菜单数据获取 Hook
 * 从后端 API 获取用户的菜单树，并转换为前端可用格式
 */

import { useQuery } from "@tanstack/react-query";
import { getScrmApi } from "@/services/api";
import type { MenuGroup, MenuItem } from "../types/menu";
import { flattenMenuGroups } from "../lib/menu-transformer";

/**
 * 获取当前用户的菜单树
 *
 * @returns TanStack Query 的结果，包含菜单数据、加载状态、错误信息等
 *
 * @example
 * ```tsx
 * function AppSidebar() {
 *   const { data: menuGroups, isLoading, error } = useMenuTree();
 *
 *   if (isLoading) return <MenuSkeleton />;
 *   if (error) return <ErrorMessage />;
 *
 *   return menuGroups.map(group => <NavGroup key={group.title} {...group} />);
 * }
 * ```
 */
export function useMenuTree() {
  return useQuery<MenuGroup[]>({
    queryKey: ["menu-tree"],
    queryFn: async (): Promise<MenuGroup[]> => {
      const { menuControllerGetUserMenus } = getScrmApi();
      const result = await menuControllerGetUserMenus();
      // TODO: 根据实际 API 响应结构调整类型解析
      return (result as any)?.groups || [];
    },
    staleTime: 5 * 60 * 1000, // 5 分钟内不重新请求
    gcTime: 10 * 60 * 1000, // 10 分钟后垃圾回收
    retry: 1, // 失败时重试一次
  });
}

/**
 * 获取展平的菜单列表（用于搜索）
 *
 * @returns 展平的菜单项数组
 *
 * @example
 * ```tsx
 * function MenuSearch() {
 *   const flatMenus = useFlatMenus();
 *   const [query, setQuery] = useState("");
 *
 *   const results = flatMenus.filter(menu =>
 *     menu.title.toLowerCase().includes(query.toLowerCase())
 *   );
 * }
 * ```
 */
export function useFlatMenus(): MenuItem[] {
  const { data: menuGroups } = useMenuTree();

  if (!menuGroups || menuGroups.length === 0) {
    return [];
  }

  return flattenMenuGroups(menuGroups);
}

// ========== 以下是兼容旧权限系统的函数，暂时保留 ==========

/**
 * @deprecated 旧版权限树节点类型，仅为兼容保留
 */
export interface PermissionTreeNode {
  id: string;
  name: string;
  type: "menu" | "button" | "data";
  permissions?: Array<{
    id: string;
    name: string;
    code: string;
    type: "menu" | "button" | "data";
    description?: string;
    status: number;
    createdAt: string;
    updatedAt: string;
  }>;
  children?: PermissionTreeNode[];
}

/**
 * @deprecated 旧版菜单树节点类型，仅为兼容保留
 */
export interface MenuNode {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  permissions?: Array<{
    id: string;
    name: string;
    code: string;
    type: string;
    description?: string;
    status: number;
  }>;
  children?: MenuNode[];
}

/**
 * @deprecated 兼容旧的权限树转换函数
 */
export function convertToPermissionTree(
  menus: MenuNode[],
): PermissionTreeNode[] {
  return menus.map((menu) => ({
    id: menu.id,
    name: menu.name,
    type: "menu" as const,
    permissions: menu.permissions?.map((p) => ({
      id: p.id,
      name: p.name,
      code: p.code,
      type: p.type as "menu" | "button" | "data",
      description: p.description,
      status: p.status,
      createdAt: "",
      updatedAt: "",
    })),
    children: menu.children ? convertToPermissionTree(menu.children) : [],
  }));
}

/**
 * @deprecated 兼容旧的权限 ID 收集函数
 */
export function collectPermissionIds(nodes: PermissionTreeNode[]): string[] {
  const ids: string[] = [];

  function traverse(node: PermissionTreeNode) {
    if (node.permissions) {
      node.permissions.forEach((p) => ids.push(p.id));
    }
    if (node.children) {
      node.children.forEach(traverse);
    }
  }

  nodes.forEach(traverse);
  return ids;
}

/**
 * @deprecated 兼容旧的节点权限收集函数
 */
export function collectNodePermissionIds(node: PermissionTreeNode): string[] {
  const ids: string[] = [];

  if (node.permissions) {
    node.permissions.forEach((p) => ids.push(p.id));
  }

  if (node.children) {
    node.children.forEach((child) => {
      ids.push(...collectNodePermissionIds(child));
    });
  }

  return ids;
}
