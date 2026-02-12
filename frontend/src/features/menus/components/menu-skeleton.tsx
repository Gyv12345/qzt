/**
 * 菜单加载骨架屏组件
 * 在菜单数据加载时显示，提供良好的用户体验
 */

import { Skeleton } from "@/components/ui/skeleton";
import { SidebarMenu } from "@/components/ui/sidebar";

/**
 * 单个菜单项骨架屏
 */
function MenuItemSkeleton() {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-24 rounded" />
    </div>
  );
}

/**
 * 菜单分组骨架屏
 */
function MenuGroupSkeleton() {
  return (
    <div className="space-y-3 p-2">
      {/* 分组标题 */}
      <Skeleton className="h-5 w-20 rounded" />

      {/* 菜单项 */}
      <MenuItemSkeleton />
      <MenuItemSkeleton />
    </div>
  );
}

/**
 * 菜单加载骨架屏主组件
 *
 * 显示 3 个菜单分组的骨架屏，模拟真实菜单结构
 */
export function MenuSkeleton() {
  return (
    <div className="space-y-4">
      <MenuGroupSkeleton />
      <MenuGroupSkeleton />
      <MenuGroupSkeleton />
    </div>
  );
}

/**
 * 使用 SidebarMenuSkeleton 的版本
 * 保持与现有菜单样式一致
 */
export function SidebarMenuSkeleton() {
  return (
    <SidebarMenu>
      <MenuItemSkeleton />
      <MenuItemSkeleton />
      <MenuItemSkeleton />
      <MenuItemSkeleton />
    </SidebarMenu>
  );
}
