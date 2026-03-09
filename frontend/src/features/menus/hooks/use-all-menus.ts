/**
 * 获取所有菜单 Hook（用于角色权限配置）
 *
 * 从后端 API 获取所有启用的菜单和按钮（树形结构）
 */

import { useQuery } from "@tanstack/react-query";
import { getScrmApi } from "@/services/api";

export interface MenuNode {
  id: string;
  path: string;
  name: string;
  icon?: string;
  groupTitle?: string | null;
  i18nKey?: string | null;
  badge?: string | null;
  parentId: string | null;
  type?: string; // "menu" | "button"
  permissionCode?: string;
  enabled: boolean;
  isHidden?: boolean;
  isSystem?: boolean;
  sort: number;
  children?: MenuNode[];
}

/**
 * 获取所有菜单树（用于角色权限配置）
 *
 * @returns TanStack Query 的结果，包含菜单树数据、加载状态、错误信息等
 *
 * @example
 * ```tsx
 * function RolePermissionSelector() {
 *   const { data: menuTree, isLoading } = useAllMenus();
 *
 *   if (isLoading) return <Loading />;
 *
 *   return <MenuTreeSelector data={menuTree} />;
 * }
 * ```
 */
export function useAllMenus() {
  return useQuery<MenuNode[]>({
    queryKey: ["menus-all"],
    queryFn: async (): Promise<MenuNode[]> => {
      const { menuControllerGetAllMenus } = getScrmApi();
      const result = await menuControllerGetAllMenus();
      return (result as any) || [];
    },
    staleTime: 10 * 60 * 1000, // 10 分钟内不重新请求
    gcTime: 30 * 60 * 1000, // 30 分钟后垃圾回收
    retry: 1,
  });
}
