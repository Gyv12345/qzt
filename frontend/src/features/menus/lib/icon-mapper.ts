/**
 * 图标名称映射到 lucide-react 组件
 * 将后端返回的图标字符串（如 "Building"）映射到 React 组件
 */

import * as LucideIcons from "lucide-react";
import type { ComponentType } from "react";

type IconName = keyof typeof LucideIcons;

/**
 * 图标名称映射表
 * 将后端存储的图标名称映射到 lucide-react 的组件名
 */
const ICON_MAP: Record<string, IconName> = {
  // 业务相关
  LayoutDashboard: "LayoutDashboard",
  Building: "Building",
  Building2: "Building2",
  BarChart3: "BarChart3",
  BarChart4: "BarChart4",
  UserCircle: "UserCircle",
  UsersRound: "UsersRound",
  Users: "Users",
  UserPlus: "UserPlus",

  // 财务相关
  PieChart: "PieChart",
  Receipt: "Receipt",
  Wallet: "Wallet",
  CreditCard: "CreditCard",
  DollarSign: "DollarSign",
  Banknote: "Banknote",

  // 系统相关
  ShieldCheck: "ShieldCheck",
  Shield: "Shield",
  Lock: "Lock",
  Archive: "Archive",
  FileText: "FileText",
  FileCheck: "FileCheck",
  FileSignature: "FileSignature",
  Webhook: "Webhook",
  History: "History",
  ClipboardList: "ClipboardList",
  Sliders: "Sliders",
  Settings: "Settings",
  Layout: "Layout",
  LayoutGrid: "LayoutGrid",
  LayoutList: "LayoutList",
  Tag: "Tag",
  Tags: "Tags",
  Terminal: "Terminal",
  Share2: "Share2",
  MoreHorizontal: "MoreHorizontal",

  // 操作相关
  ChevronRight: "ChevronRight",
  ChevronDown: "ChevronDown",
  ChevronLeft: "ChevronLeft",
  ChevronUp: "ChevronUp",
  Plus: "Plus",
  Minus: "Minus",
  X: "X",
  Check: "Check",

  // 营销相关
  Newspaper: "Newspaper",
  PenTool: "PenTool",
  Image: "Image",
  Video: "Video",
  Megaphone: "Megaphone",

  // 服务相关
  Headphones: "Headphones",
  MessageSquare: "MessageSquare",
  Mail: "Mail",
  AtSign: "AtSign",

  // 其他
  Home: "Home",
  Dashboard: "LayoutDashboard",
  Menu: "Menu",
  Search: "Search",
  Bell: "Bell",
  Info: "Info",
  AlertTriangle: "AlertTriangle",
  AlertCircle: "AlertCircle",
  HelpCircle: "HelpCircle",
  LogOut: "LogOut",
};

/**
 * 将后端返回的图标字符串转换为 React 组件
 */
export function getIconComponent(
  iconName?: string,
): ComponentType<{ className?: string }> | undefined {
  if (!iconName) {
    return undefined;
  }

  // 尝试从映射表中获取
  const mappedName = ICON_MAP[iconName] || iconName;

  // 动态访问 lucide-icons 导出
  const IconComponent = (
    LucideIcons as unknown as Record<
      string,
      ComponentType<{ className?: string }>
    >
  )[mappedName];

  return IconComponent || undefined;
}

/**
 * 获取所有可用的图标名称列表
 */
export function getAvailableIconNames(): string[] {
  return Object.keys(ICON_MAP);
}
