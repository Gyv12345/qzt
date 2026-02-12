import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { DefaultMenuConfig, MenuItemDto, MenuGroupDto } from "./dto/menu.dto";

/**
 * 默认菜单配置
 * 包含系统所有菜单项的结构定义
 *
 * i18nKey 说明：
 * - groupI18nKey: 分组标题的翻译 key（如 menu.sidebar.business）
 * - i18nKey: 菜单项标题的翻译 key（如 menu.sidebar.contacts）
 */
const DEFAULT_MENUS: DefaultMenuConfig[] = [
  // === 业务分组 ===
  {
    name: "工作台",
    path: "/",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.dashboard",
    icon: "LayoutDashboard",
    sort: 1,
    enabled: true,
  },
  {
    name: "联系人管理",
    path: "/contacts",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.contacts",
    icon: "UserCircle",
    sort: 3,
    enabled: true,
  },
  {
    name: "客户管理",
    path: "/customers",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.customers",
    icon: "Building",
    sort: 4,
    enabled: true,
  },
  {
    name: "合同管理",
    path: "/contracts",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.contracts",
    icon: "FileCheck",
    sort: 5,
    enabled: true,
  },
  {
    name: "服务团队",
    path: "/service-teams",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.serviceTeams",
    icon: "UsersRound",
    sort: 6,
    enabled: true,
  },
  {
    name: "发票管理",
    path: "/invoices",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.invoices",
    icon: "Receipt",
    sort: 8,
    enabled: true,
  },
  {
    name: "收款管理",
    path: "/payments",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.payments",
    icon: "Wallet",
    sort: 9,
    enabled: true,
  },

  // === 内容管理分组 ===
  {
    name: "文章管理",
    path: "/cms",
    groupTitle: "内容管理",
    groupI18nKey: "menu.sidebar.content",
    i18nKey: "menu.sidebar.cms",
    icon: "FileText",
    sort: 20,
    enabled: true,
  },
  {
    name: "页面管理",
    path: "/cms/pages",
    groupTitle: "内容管理",
    groupI18nKey: "menu.sidebar.content",
    i18nKey: "menu.sidebar.cmsPages",
    icon: "Layout",
    sort: 21,
    enabled: true,
  },
  {
    name: "标签管理",
    path: "/cms/tags",
    groupTitle: "内容管理",
    groupI18nKey: "menu.sidebar.content",
    i18nKey: "menu.sidebar.cmsTags",
    icon: "Tag",
    sort: 22,
    enabled: true,
  },
  {
    name: "新媒体管理",
    path: "/social-media",
    groupTitle: "内容管理",
    groupI18nKey: "menu.sidebar.content",
    i18nKey: "menu.sidebar.socialMedia",
    icon: "Share2",
    sort: 23,
    enabled: true,
  },

  // === 业务设置分组 ===
  {
    name: "产品管理",
    path: "/products",
    groupTitle: "业务设置",
    groupI18nKey: "menu.sidebar.businessSettings",
    i18nKey: "menu.sidebar.products",
    icon: "Archive",
    sort: 30,
    enabled: true,
  },
  {
    name: "合同模板设置",
    path: "/contract-templates",
    groupTitle: "业务设置",
    groupI18nKey: "menu.sidebar.businessSettings",
    i18nKey: "menu.sidebar.contractTemplates",
    icon: "FileSignature",
    sort: 31,
    enabled: true,
  },
  {
    name: "客户规则",
    path: "/customer-rules",
    groupTitle: "业务设置",
    groupI18nKey: "menu.sidebar.businessSettings",
    i18nKey: "menu.sidebar.customerRules",
    icon: "Sliders",
    sort: 32,
    enabled: true,
  },
  {
    name: "Webhook配置",
    path: "/webhooks",
    groupTitle: "业务设置",
    groupI18nKey: "menu.sidebar.businessSettings",
    i18nKey: "menu.sidebar.webhooks",
    icon: "Webhook",
    sort: 33,
    enabled: true,
  },

  // === 系统设置分组 ===
  {
    name: "用户管理",
    path: "/users",
    groupTitle: "系统设置",
    groupI18nKey: "menu.sidebar.systemSettings",
    i18nKey: "menu.sidebar.users",
    icon: "Users",
    sort: 40,
    enabled: true,
  },
  {
    name: "部门管理",
    path: "/departments",
    groupTitle: "系统设置",
    groupI18nKey: "menu.sidebar.systemSettings",
    i18nKey: "menu.sidebar.departments",
    icon: "Building",
    sort: 41,
    enabled: true,
  },
  {
    name: "角色管理",
    path: "/roles",
    groupTitle: "系统设置",
    groupI18nKey: "menu.sidebar.systemSettings",
    i18nKey: "menu.sidebar.roles",
    icon: "ShieldCheck",
    sort: 42,
    enabled: true,
  },
  {
    name: "权限管理",
    path: "/permissions",
    groupTitle: "系统设置",
    groupI18nKey: "menu.sidebar.systemSettings",
    i18nKey: "menu.sidebar.permissions",
    icon: "Lock",
    sort: 43,
    enabled: true,
  },
  {
    name: "登录日志",
    path: "/login-logs",
    groupTitle: "系统设置",
    groupI18nKey: "menu.sidebar.systemSettings",
    i18nKey: "menu.sidebar.loginLogs",
    icon: "History",
    sort: 45,
    enabled: true,
  },
  {
    name: "操作日志",
    path: "/operation-logs",
    groupTitle: "系统设置",
    groupI18nKey: "menu.sidebar.systemSettings",
    i18nKey: "menu.sidebar.operationLogs",
    icon: "ClipboardList",
    sort: 46,
    enabled: true,
  },
  {
    name: "系统日志",
    path: "/system-logs",
    groupTitle: "系统设置",
    groupI18nKey: "menu.sidebar.systemSettings",
    i18nKey: "menu.sidebar.systemLogs",
    icon: "Terminal",
    sort: 47,
    enabled: true,
  },
];

@Injectable()
export class MenuService {
  private readonly logger = new Logger(MenuService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取当前用户的菜单树（按分组返回）
   * @param userId 当前用户ID
   * @param isAdmin 是否为管理员
   * @returns 按分组的菜单列表
   */
  async getUserMenus(
    userId: string,
    isAdmin: boolean,
  ): Promise<MenuGroupDto[]> {
    // 获取用户角色
    const userRoles = await this.getUserRoles(userId);

    // 如果是超级管理员，返回所有启用的菜单
    if (isAdmin) {
      return this.buildMenuGroups(await this.getAllEnabledMenus());
    }

    // 根据用户角色获取有权限的菜单
    const authorizedMenus = await this.getMenusByRoles(userRoles);

    return this.buildMenuGroups(authorizedMenus);
  }

  /**
   * 初始化默认菜单数据
   * 仅在首次运行时调用
   */
  async initializeMenus(): Promise<{ created: number; skipped: number }> {
    let created = 0;
    let skipped = 0;

    for (const menuData of DEFAULT_MENUS) {
      const existing = await this.prisma.menu.findUnique({
        where: { path: menuData.path },
      });

      if (existing) {
        skipped++;
        this.logger.debug(`菜单已存在: ${menuData.name} (${menuData.path})`);
        continue;
      }

      await this.prisma.menu.create({
        data: {
          path: menuData.path,
          name: menuData.name,
          icon: menuData.icon,
          sort: menuData.sort || 0,
          enabled: menuData.enabled !== undefined ? menuData.enabled : true,
        },
      });

      created++;
      this.logger.debug(`创建菜单: ${menuData.name} (${menuData.path})`);
    }

    this.logger.log(`菜单初始化完成: 创建 ${created} 个，跳过 ${skipped} 个`);

    return { created, skipped };
  }

  /**
   * 获取所有启用的菜单
   */
  private async getAllEnabledMenus(): Promise<MenuItemDto[]> {
    const menus = await this.prisma.menu.findMany({
      where: { enabled: true },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    });

    return menus.map(this.mapToMenuItemDto);
  }

  /**
   * 根据用户角色获取有权限的菜单
   */
  private async getMenusByRoles(
    userRoles: Array<{ id: string; code: string }>,
  ): Promise<MenuItemDto[]> {
    if (userRoles.length === 0) {
      return [];
    }

    // 获取角色关联的菜单权限
    const roleIds = userRoles.map((r) => r.id);

    const menuPermissions = await this.prisma.menuPermission.findMany({
      where: {
        permission: {
          rolePermissions: {
            some: {
              roleId: {
                in: roleIds,
              },
            },
          },
        },
      },
      include: {
        menu: true,
      },
    });

    // 提取菜单ID去重
    const menuIds = [...new Set(menuPermissions.map((mp) => mp.menuId))];

    if (menuIds.length === 0) {
      return [];
    }

    const menus = await this.prisma.menu.findMany({
      where: {
        id: { in: menuIds },
        enabled: true,
      },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    });

    return menus.map(this.mapToMenuItemDto);
  }

  /**
   * 获取用户角色列表
   */
  private async getUserRoles(
    userId: string,
  ): Promise<Array<{ id: string; code: string }>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    return user.roles.map((ur) => ({
      id: ur.role.id,
      code: ur.role.code,
    }));
  }

  /**
   * 将 Prisma Menu 模型映射为 MenuItemDto
   */
  private mapToMenuItemDto(menu: any): MenuItemDto {
    // 从 DEFAULT_MENUS 中查找对应的 i18nKey
    const defaultMenu = DEFAULT_MENUS.find((m) => m.path === menu.path);

    return {
      id: menu.id,
      path: menu.path,
      name: menu.name,
      title: menu.name,
      i18nKey: defaultMenu?.i18nKey,
      icon: menu.icon,
      sort: menu.sort,
      enabled: menu.enabled,
    };
  }

  /**
   * 构建按分组的菜单列表
   * 根据 DEFAULT_MENUS 中的 groupTitle 进行分组
   */
  private buildMenuGroups(menus: MenuItemDto[]): MenuGroupDto[] {
    // 从 DEFAULT_MENUS 提取分组信息
    const groupMap = new Map<
      string,
      { title: string; i18nKey?: string; items: MenuItemDto[] }
    >();

    // 初始化分组
    for (const menu of DEFAULT_MENUS) {
      if (!groupMap.has(menu.groupTitle)) {
        groupMap.set(menu.groupTitle, {
          title: menu.groupTitle,
          i18nKey: menu.groupI18nKey,
          items: [],
        });
      }
    }

    // 将菜单添加到对应分组
    for (const menu of menus) {
      // 查找菜单所属分组
      const defaultMenu = DEFAULT_MENUS.find((m) => m.path === menu.path);
      if (defaultMenu) {
        const group = groupMap.get(defaultMenu.groupTitle);
        if (group) {
          group.items.push(menu);
        }
      }
    }

    // 转换为数组并过滤掉没有菜单的分组
    return Array.from(groupMap.values())
      .filter((group) => group.items.length > 0)
      .map((group) => ({
        title: group.title,
        i18nKey: group.i18nKey,
        items: group.items.sort((a, b) => a.sort - b.sort),
      }));
  }
}
