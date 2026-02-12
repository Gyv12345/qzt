/**
 * 菜单相关类型定义
 * 与后端 menu.dto.ts 保持同步
 */

/**
 * 菜单项
 */
export interface MenuItem {
  id: string;
  path: string;
  title: string;
  i18nKey?: string;
  icon?: string;
  badge?: string;
  sort: number;
  enabled: boolean;
}

/**
 * 菜单组
 */
export interface MenuGroup {
  title: string;
  i18nKey?: string;
  items: MenuItem[];
}

/**
 * 菜单初始化响应
 */
export interface InitializeMenuResponse {
  created: number;
  skipped: number;
}
