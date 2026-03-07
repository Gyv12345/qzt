/**
 * 菜单相关类型定义
 * 与后端 MenuController 返回的数据结构保持一致
 */

import { z } from "zod";

/**
 * 单个菜单项
 */
export interface MenuItem {
  id: string;
  path: string;
  title: string;
  i18nKey?: string;
  icon?: string;
  sort: number;
  enabled: boolean;
  children?: MenuItem[];
  badge?: string | number;
}

/**
 * 菜单分组
 */
export interface MenuGroup {
  title: string;
  i18nKey?: string;
  items: MenuItem[];
}

/**
 * 后端返回的菜单树响应
 */
export interface MenuTreeResponse {
  groups: MenuGroup[];
}

/**
 * 菜单初始化响应
 */
export interface MenuInitializeResponse {
  created: number;
  skipped: number;
}

/**
 * 前端 NavItem 类型（兼容现有 nav-group 组件）
 */
export interface NavItem {
  title: string;
  url?: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string | { text: string; variant?: string };
  items?: NavItem[];
}

/**
 * 前端 NavGroup 类型（兼容现有 nav-group 组件）
 */
export interface NavGroup {
  title: string;
  items: NavItem[];
}

// ========== 菜单管理相关类型 ==========

/**
 * 菜单节点（用于树形结构展示）
 */
export interface MenuNode {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  icon?: string;
  sort: number;
  status: number;
  permissions?: Permission[];
  children?: MenuNode[];
}

/**
 * 权限类型（简化版）
 */
export interface Permission {
  id: string;
  name: string;
  code: string;
  type: "menu" | "button" | "data";
  description?: string;
}

/**
 * 菜单实体（用于数据传输）
 */
export interface Menu {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  icon?: string;
  sort: number;
  status: number;
  permissions?: Permission[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 菜单表单值类型
 */
export interface MenuFormValues {
  name: string;
  path: string;
  icon?: string;
  parentId?: string;
  sort: number;
  status: number;
  permissionIds?: string[];
}

/**
 * 菜单表单验证 Schema
 */
export const menuFormSchema = z.object({
  name: z.string().min(1, "菜单名称不能为空"),
  path: z.string().min(1, "菜单路径不能为空"),
  icon: z.string().optional(),
  parentId: z.string().optional(),
  sort: z.number().min(0),
  status: z.number().int().min(0).max(1),
  permissionIds: z.array(z.string()).optional(),
});
