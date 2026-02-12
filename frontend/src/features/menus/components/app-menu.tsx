/**
 * 动态菜单组件
 * 从后端 API 获取菜单数据并渲染
 * 替代原来硬编码的 sidebar-data
 */

import { useMenuTree } from "../hooks/use-menu-tree";
import { NavGroup as NavGroupComponent } from "@/components/layout/nav-group";
import { MenuSkeleton } from "./menu-skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * 应用菜单主组件
 *
 * 从后端 API 动态获取用户的菜单配置并渲染
 *
 * @example
 * ```tsx
 * // 在 app-sidebar.tsx 中使用
 * import { AppMenu } from "@/features/menus/components/app-menu";
 *
 * <SidebarContent>
 *   <AppMenu />
 * </SidebarContent>
 * ```
 */
export function AppMenu() {
  const { data: menuGroups, isLoading, error } = useMenuTree();

  // 加载状态
  if (isLoading) {
    return <MenuSkeleton />;
  }

  // 错误状态
  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>菜单加载失败，请刷新页面重试。</AlertDescription>
      </Alert>
    );
  }

  // 空数据状态（不应该发生，至少应该有工作台）
  if (!menuGroups || menuGroups.length === 0) {
    return (
      <Alert className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>暂无可用的菜单，请联系管理员。</AlertDescription>
      </Alert>
    );
  }

  // 渲染菜单分组
  return (
    <>
      {(menuGroups as any[]).map((group) => (
        <NavGroupComponent key={group.title} {...group} />
      ))}
    </>
  );
}
