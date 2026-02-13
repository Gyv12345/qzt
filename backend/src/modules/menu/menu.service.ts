import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { DefaultMenuConfig, MenuItemDto, MenuGroupDto } from "./dto/menu.dto";

/**
 * 按钮权限配置
 * 格式：`资源:操作`（如 contacts:view）
 *
 * ⚠️ 添加新菜单或按钮时，请同步更新 CLAUDE.md 中的权限清单
 */
const PERMISSION_CONFIG: Record<string, string[]> = {
  contacts: [
    "view",
    "create",
    "edit",
    "delete",
    "export",
    "import",
    "history",
    "linkCustomer",
  ],
  customers: [
    "view",
    "create",
    "edit",
    "delete",
    "export",
    "import",
    "batchUpdate",
    "batchAssign",
  ],
  contracts: ["view", "create", "edit", "delete", "updatePayment", "detail"],
  "service-teams": ["view", "create", "edit", "delete"],
  invoices: ["view", "create", "edit", "delete", "detail"],
  payments: ["view", "create", "edit", "delete", "confirm", "detail"],
  cms: ["view", "create", "edit"],
  products: ["view", "create", "edit", "delete", "detail"],
  "contract-templates": ["view", "create", "edit", "preview"],
  webhooks: ["view", "create"],
  users: ["view", "create", "createBatch", "edit", "delete"],
  roles: ["view", "create", "edit", "delete"],
  // 日志类只有 view
  "login-logs": ["view"],
  "operation-logs": ["view"],
  "system-logs": ["view"],
};

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
   * 创建菜单及其按钮权限子节点
   *
   * 使用 upsert 模式，可安全重复调用
   */
  async initializeMenus(): Promise<{
    menus: { created: number; skipped: number };
    permissions: { created: number; skipped: number };
  }> {
    let menuCreated = 0;
    let menuSkipped = 0;
    let permissionCreated = 0;
    let permissionSkipped = 0;

    // 1. 创建/更新菜单
    for (const menuData of DEFAULT_MENUS) {
      const existing = await this.prisma.menu.findUnique({
        where: { path: menuData.path },
      });

      if (existing) {
        menuSkipped++;
        this.logger.debug(`菜单已存在: ${menuData.name} (${menuData.path})`);
      } else {
        await this.prisma.menu.create({
          data: {
            path: menuData.path,
            name: menuData.name,
            icon: menuData.icon,
            sort: menuData.sort || 0,
            enabled: menuData.enabled !== undefined ? menuData.enabled : true,
            type: "menu",
          },
        });
        menuCreated++;
        this.logger.debug(`创建菜单: ${menuData.name} (${menuData.path})`);
      }
    }

    // 2. 为每个菜单创建按钮权限子节点
    for (const [resourceKey, actions] of Object.entries(PERMISSION_CONFIG)) {
      // 查找父菜单
      const parentMenu = await this.prisma.menu.findFirst({
        where: {
          path: {
            contains: resourceKey,
          },
          type: "menu",
        },
      });

      if (!parentMenu) {
        this.logger.warn(`未找到菜单: ${resourceKey}`);
        continue;
      }

      for (const action of actions) {
        const permissionCode = `${resourceKey}:${action}`;
        const permissionName = this.formatPermissionName(action);

        // 检查权限是否已存在
        const existing = await this.prisma.menu.findFirst({
          where: {
            parentId: parentMenu.id,
            permissionCode: permissionCode,
          },
        });

        if (existing) {
          permissionSkipped++;
          this.logger.debug(`权限已存在: ${permissionCode}`);
          continue;
        }

        await this.prisma.menu.create({
          data: {
            path: `${parentMenu.path}/${action}`,
            name: permissionName,
            type: "button",
            permissionCode: permissionCode,
            parentId: parentMenu.id,
            sort: action === "view" ? 0 : 1, // view 权限排在最前
            enabled: true,
          },
        });

        permissionCreated++;
        this.logger.debug(`创建权限: ${permissionCode}`);
      }
    }

    this.logger.log(
      `菜单初始化完成: 菜单[创建 ${menuCreated}, 跳过 ${menuSkipped}], 权限[创建 ${permissionCreated}, 跳过 ${permissionSkipped}]`,
    );

    return {
      menus: { created: menuCreated, skipped: menuSkipped },
      permissions: { created: permissionCreated, skipped: permissionSkipped },
    };
  }

  /**
   * 格式化权限名称
   * 将操作码转换为可读名称
   */
  private formatPermissionName(action: string): string {
    const actionNames: Record<string, string> = {
      view: "查看",
      create: "新建",
      edit: "编辑",
      delete: "删除",
      export: "导出",
      import: "导入",
      history: "历史记录",
      linkCustomer: "关联客户",
      batchUpdate: "批量更新",
      batchAssign: "批量分配",
      updatePayment: "更新收款",
      detail: "查看详情",
      createBatch: "批量添加",
      confirm: "确认收款",
      preview: "预览",
    };
    return actionNames[action] || action;
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

    // 获取角色关联的菜单
    const roleIds = userRoles.map((r) => r.id);

    const roleMenus = await this.prisma.roleMenu.findMany({
      where: {
        roleId: {
          in: roleIds,
        },
      },
      include: {
        menu: true,
      },
    });

    // 提取菜单ID去重
    const menuIds = [...new Set(roleMenus.map((rm) => rm.menuId))];

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
   * 获取所有菜单树（用于角色权限配置）
   * 返回所有启用的菜单和按钮，树形结构
   */
  async getAllMenusTree(): Promise<any[]> {
    const menus = await this.prisma.menu.findMany({
      where: {
        enabled: true,
      },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    });

    // 构建树形结构
    const buildTree = (parentId: string | null = null) => {
      return menus
        .filter((menu) => menu.parentId === parentId)
        .map((menu) => ({
          ...menu,
          children: buildTree(menu.id),
        }));
    };

    return buildTree();
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
