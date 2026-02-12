import { useQuery } from "@tanstack/react-query";
import { getScrmApi } from "@/services/api";
import type { MenuGroupDto } from "@/components/layout/types";

/**
 * 获取当前用户的菜单分组
 * 这是新的动态菜单 API，替代硬编码的 sidebar-data.ts
 */
export function useUserMenus() {
  return useQuery<MenuGroupDto[]>({
    queryKey: ["user-menus"],
    queryFn: async () => {
      const result = (await getScrmApi().menuControllerGetUserMenus()) as any;
      return result as MenuGroupDto[];
    },
    staleTime: 5 * 60 * 1000, // 5 分钟内数据不会过期
  });
}

/**
 * 初始化菜单数据（首次运行时调用）
 */
export function useInitializeMenus() {
  // 这是一个一次性操作，通常在系统初始化时调用
  // 不使用 useQuery，因为不需要缓存
  const initializeMenus = async () => {
    const result = (await getScrmApi().menuControllerInitializeMenus()) as any;
    return result as { created: number; skipped: number };
  };

  return { initializeMenus };
}
