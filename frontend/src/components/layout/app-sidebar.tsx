import { useLayout } from "@/context/layout-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { sidebarData } from "./data/sidebar-data";
import { NavGroup } from "./nav-group";
import { TeamSwitcher } from "./team-switcher";
import { useUserMenus } from "@/features/menus/hooks/use-user-menus";
import type { MenuGroupDto, MenuItemDto } from "./types";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Building,
  UserCircle,
  UsersRound,
  FileCheck,
  Receipt,
  Wallet,
  FileText,
  Layout,
  Tag,
  Share2,
  Archive,
  FileSignature,
  Sliders,
  Webhook,
  Users,
  ShieldCheck,
  Lock,
  History,
  ClipboardList,
  Terminal,
  CircleDashed,
} from "lucide-react";

/**
 * 图标名称到图标的映射（手动维护避免类型问题）
 */
const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Building,
  UserCircle,
  UsersRound,
  FileCheck,
  Receipt,
  Wallet,
  FileText,
  Layout,
  Tag,
  Share2,
  Archive,
  FileSignature,
  Sliders,
  Webhook,
  Users,
  ShieldCheck,
  Lock,
  History,
  ClipboardList,
  Terminal,
  BarChart3: LayoutDashboard, // 别名
  PieChart: FileText, // 别名
};

/**
 * 获取图标组件
 */
function getIconComponent(iconName?: string): React.ElementType | undefined {
  if (!iconName) return undefined;

  // 直接从映射表查找
  if (iconMap[iconName]) {
    return iconMap[iconName];
  }

  // 尝试处理 PascalCase 命名（如 LayoutDashboard）
  const cleanName = iconName.replace(/Icon$/, "");
  if (iconMap[cleanName]) {
    return iconMap[cleanName];
  }

  return CircleDashed;
}

/**
 * 将后端菜单数据转换为 NavGroup 格式（使用 i18n 翻译）
 */
function convertToNavGroups(
  menuGroups: MenuGroupDto[],
  t: (key: string) => string,
) {
  return menuGroups.map((group) => ({
    title: group.i18nKey ? t(group.i18nKey) : group.title,
    variant: getGroupVariant(group.title),
    items: group.items.map((item) => convertToNavItem(item, t)),
  }));
}

/**
 * 根据分组标题确定样式变体
 */
function getGroupVariant(title: string): string | undefined {
  const customerGroups = ["客户", "客户中心", "Customers"];
  return customerGroups.includes(title) ? "customer" : undefined;
}

/**
 * 将单个菜单项转换为 NavItem 格式（使用 i18n 翻译）
 */
function convertToNavItem(item: MenuItemDto, t: (key: string) => string) {
  const Icon = getIconComponent(item.icon);

  return {
    title: item.i18nKey ? t(item.i18nKey) : item.title,
    url: item.path,
    icon: Icon || CircleDashed,
    badge: item.badge,
  };
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout();
  const { data: userMenus, isLoading, error } = useUserMenus();
  const { t } = useTranslation();

  // 使用动态菜单数据，如果加载失败则回退到静态数据
  const navGroups = userMenus
    ? convertToNavGroups(userMenus, t)
    : sidebarData.navGroups;

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <TeamSwitcher teams={sidebarData.teams} />

        {/* Replace <TeamSwitch /> with the following <AppTitle />
         /* if you want to use the normal app title instead of TeamSwitch dropdown */}
        {/* <AppTitle /> */}
      </SidebarHeader>
      <SidebarContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <CircleDashed className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-muted-foreground">
            菜单加载失败，使用默认菜单
          </div>
        ) : (
          navGroups.map((props) => <NavGroup key={props.title} {...props} />)
        )}
      </SidebarContent>
      {/* 侧边栏底部暂时隐藏用户菜单，因为头部已有用户头像 */}
      {/* <SidebarFooter>
        <NavUser />
      </SidebarFooter> */}
      <SidebarRail />
    </Sidebar>
  );
}
