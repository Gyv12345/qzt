import { type LinkProps } from "@tanstack/react-router";

/**
 * 后端 Menu 模型同步类型
 * 对应 backend/prisma/schema.prisma 中的 Menu 模型
 */
type Menu = {
  id: string;
  path: string;
  name: string;
  icon?: string;
  parentId?: string;
  sort: number;
  enabled: boolean;
  groupTitle?: string;
  i18nKey?: string;
  badge?: string;
  isHidden?: boolean;
  isSystem?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  children?: Menu[];
};

/**
 * 创建菜单 DTO（与后端 CreateMenuDto 同步）
 */
type CreateMenuDto = {
  path: string;
  name: string;
  groupTitle: string;
  i18nKey?: string;
  icon?: string;
  parentId?: string;
  sort?: number;
  enabled?: boolean;
  hasChildren?: boolean;
};

/**
 * 菜单项响应 DTO（与后端 MenuItemDto 同步）
 */
type MenuItemDto = {
  id: string;
  path: string;
  name: string;
  title: string;
  i18nKey?: string;
  icon?: string;
  badge?: string;
  sort: number;
  enabled: boolean;
};

/**
 * 菜单组响应 DTO（与后端 MenuGroupDto 同步）
 */
type MenuGroupDto = {
  title: string;
  i18nKey?: string;
  items: MenuItemDto[];
};

type User = {
  name: string;
  email: string;
  avatar: string;
};

type Team = {
  name: string;
  logo: React.ElementType | string;
  plan: string;
};

type BaseNavItem = {
  title: string;
  badge?: string | { text: string; variant?: string };
  icon?: React.ElementType;
  variant?: string;
};

type NavLink = BaseNavItem & {
  url: LinkProps["to"] | (string & {});
  items?: never;
};

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: LinkProps["to"] | (string & {}) })[];
  url?: never;
};

type NavItem = NavCollapsible | NavLink;

type NavGroup = {
  title: string;
  items: NavItem[];
  variant?: string;
};

type SidebarData = {
  user: User;
  teams: Team[];
  navGroups: NavGroup[];
};

export type {
  SidebarData,
  NavGroup,
  NavItem,
  NavCollapsible,
  NavLink,
  Menu,
  CreateMenuDto,
  MenuItemDto,
  MenuGroupDto,
};
