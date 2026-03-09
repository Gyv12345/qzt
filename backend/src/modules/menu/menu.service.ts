import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import {
  MenuItemDto,
  MenuGroupDto,
  CreateMenuDto,
  UpdateMenuDto,
} from "./dto/menu.dto";

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
  "ai-agent": ["view", "config"],
  users: ["view", "create", "createBatch", "edit", "delete"],
  roles: ["view", "create", "edit", "delete"],
  // 日志类只有 view
  "login-logs": ["view"],
  "operation-logs": ["view"],
  "system-logs": ["view"],
};

/**
 * 完整菜单配置
 * 用于 initializeMenus() 方法初始化菜单数据
 */
const DEFAULT_MENUS = [
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
    type: "menu",
  },
  // 客户中心父菜单（用于建立父子关系）
  {
    name: "客户中心",
    path: "/customer-center",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.customerCenter",
    icon: "Building",
    sort: 2,
    type: "group",
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
    type: "menu",
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
    type: "menu",
  },
  // 合同父菜单（用于建立父子关系）
  {
    name: "合同",
    path: "/contracts-group",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.contractsGroup",
    icon: "FileCheck",
    sort: 5,
    type: "group",
    enabled: true,
  },
  {
    name: "合同管理",
    path: "/contracts",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.contracts",
    icon: "FileCheck",
    sort: 6,
    enabled: true,
    type: "menu",
  },
  {
    name: "服务团队",
    path: "/service-teams",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.serviceTeams",
    icon: "UsersRound",
    sort: 7,
    enabled: true,
    type: "menu",
  },
  {
    name: "发票管理",
    path: "/invoices",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.invoices",
    icon: "Receipt",
    sort: 9,
    enabled: true,
    type: "menu",
  },
  {
    name: "收款管理",
    path: "/payments",
    groupTitle: "业务",
    groupI18nKey: "menu.sidebar.business",
    i18nKey: "menu.sidebar.payments",
    icon: "Wallet",
    sort: 10,
    enabled: true,
    type: "menu",
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
    type: "menu",
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
    type: "menu",
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
    type: "menu",
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
    type: "menu",
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
    type: "menu",
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
    type: "menu",
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
    type: "menu",
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
    type: "menu",
  },
  {
    name: "AI Agent",
    path: "/ai-agent",
    groupTitle: "业务设置",
    groupI18nKey: "menu.sidebar.businessSettings",
    i18nKey: "menu.sidebar.aiAgent",
    icon: "Bot",
    sort: 34,
    enabled: true,
    type: "menu",
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
    type: "menu",
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
    type: "menu",
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
    type: "menu",
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
    type: "menu",
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
    type: "menu",
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
    type: "menu",
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
    menus: { created: number; updated: number };
    permissions: { created: number; skipped: number };
  }> {
    let menuCreated = 0;
    let menuUpdated = 0;
    let permissionCreated = 0;
    let permissionSkipped = 0;

    // 1. 创建/更新菜单（使用 upsert 模式）
    for (const menuData of DEFAULT_MENUS) {
      const existing = await this.prisma.menu.findUnique({
        where: { path: menuData.path },
      });

      if (existing) {
        // 更新现有菜单，写入完整的 i18n 字段
        await this.prisma.menu.update({
          where: { id: existing.id },
          data: {
            name: menuData.name,
            icon: menuData.icon,
            sort: menuData.sort || 0,
            type: menuData.type || "menu",
            groupTitle: menuData.groupTitle,
            groupI18nKey: menuData.groupI18nKey,
            i18nKey: menuData.i18nKey,
            // 注意：不更新 enabled，保留手动修改
          },
        });
        menuUpdated++;
        this.logger.debug(`更新菜单: ${menuData.name} (${menuData.path})`);
      } else {
        await this.prisma.menu.create({
          data: {
            path: menuData.path,
            name: menuData.name,
            icon: menuData.icon,
            sort: menuData.sort || 0,
            enabled: menuData.enabled !== undefined ? menuData.enabled : true,
            type: menuData.type || "menu",
            groupTitle: menuData.groupTitle,
            groupI18nKey: menuData.groupI18nKey,
            i18nKey: menuData.i18nKey,
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

    // 3. 设置菜单父子关系
    await this.setupMenuParentRelationships();

    this.logger.log(
      `菜单初始化完成: 菜单[创建 ${menuCreated}, 更新 ${menuUpdated}], 权限[创建 ${permissionCreated}, 跳过 ${permissionSkipped}]`,
    );

    return {
      menus: { created: menuCreated, updated: menuUpdated },
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
   * 获取所有启用的菜单（包含分组信息）
   * 用于构建菜单分组
   */
  private async getAllEnabledMenus(): Promise<any[]> {
    const menus = await this.prisma.menu.findMany({
      where: { enabled: true },
      orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
    });

    // 只返回实际页面菜单，过滤掉分组和按钮类型
    return menus.filter((menu) => menu.type === "menu");
  }

  /**
   * 根据用户角色获取有权限的菜单（包含分组信息）
   */
  private async getMenusByRoles(
    userRoles: Array<{ id: string; code: string }>,
  ): Promise<any[]> {
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

    // 只返回实际页面菜单，过滤掉分组和按钮类型
    return menus.filter((menu) => menu.type === "menu");
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
   * 直接从数据库记录读取 i18nKey
   */
  private mapToMenuItemDto(menu: {
    id: string;
    path: string;
    name: string;
    icon: string | null;
    sort: number;
    enabled: boolean;
    i18nKey: string | null;
  }): MenuItemDto {
    return {
      id: menu.id,
      path: menu.path,
      name: menu.name,
      title: menu.name,
      i18nKey: menu.i18nKey || undefined,
      icon: menu.icon || undefined,
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
   * 创建菜单
   */
  async createMenu(createMenuDto: CreateMenuDto): Promise<any> {
    const path = createMenuDto.path.trim();
    const existingPathMenu = await this.prisma.menu.findUnique({
      where: { path },
    });

    if (existingPathMenu) {
      throw new BadRequestException("菜单路径已存在");
    }

    const parentId = this.normalizeOptionalString(createMenuDto.parentId);
    const parent = await this.assertParentValid(null, parentId);

    const type = this.normalizeMenuType(createMenuDto.type);
    const permissionCode = this.normalizeOptionalString(
      createMenuDto.permissionCode,
    );
    if (type === "button" && !permissionCode) {
      throw new BadRequestException("按钮类型菜单必须填写权限代码");
    }

    const groupTitle =
      this.normalizeOptionalString(createMenuDto.groupTitle) ||
      parent?.groupTitle ||
      null;

    const menu = await this.prisma.menu.create({
      data: {
        path,
        name: createMenuDto.name.trim(),
        icon: this.normalizeOptionalString(createMenuDto.icon),
        parentId,
        sort: createMenuDto.sort ?? 0,
        enabled: createMenuDto.enabled ?? true,
        groupTitle,
        i18nKey: this.normalizeOptionalString(createMenuDto.i18nKey),
        type,
        permissionCode,
      },
    });

    this.logger.log(`创建菜单: ${menu.name} (${menu.path})`);
    return menu;
  }

  /**
   * 更新菜单
   */
  async updateMenu(id: string, updateMenuDto: UpdateMenuDto): Promise<any> {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
    });

    if (!menu) {
      throw new NotFoundException("菜单不存在");
    }

    if (updateMenuDto.path) {
      const path = updateMenuDto.path.trim();
      if (path && path !== menu.path) {
        const existingPathMenu = await this.prisma.menu.findUnique({
          where: { path },
        });
        if (existingPathMenu && existingPathMenu.id !== id) {
          throw new BadRequestException("菜单路径已存在");
        }
      }
    }

    const parentId =
      updateMenuDto.parentId !== undefined
        ? this.normalizeOptionalString(updateMenuDto.parentId)
        : menu.parentId;

    const parent = await this.assertParentValid(id, parentId);

    const type =
      updateMenuDto.type !== undefined
        ? this.normalizeMenuType(updateMenuDto.type)
        : menu.type;

    const permissionCode =
      updateMenuDto.permissionCode !== undefined
        ? this.normalizeOptionalString(updateMenuDto.permissionCode)
        : menu.permissionCode;
    if (type === "button" && !permissionCode) {
      throw new BadRequestException("按钮类型菜单必须填写权限代码");
    }

    const updated = await this.prisma.menu.update({
      where: { id },
      data: {
        name:
          updateMenuDto.name !== undefined ? updateMenuDto.name.trim() : undefined,
        path: updateMenuDto.path !== undefined ? updateMenuDto.path.trim() : undefined,
        icon:
          updateMenuDto.icon !== undefined
            ? this.normalizeOptionalString(updateMenuDto.icon)
            : undefined,
        badge:
          updateMenuDto.badge !== undefined
            ? this.normalizeOptionalString(updateMenuDto.badge)
            : undefined,
        parentId: updateMenuDto.parentId !== undefined ? parentId : undefined,
        sort: updateMenuDto.sort,
        enabled: updateMenuDto.enabled,
        isHidden: updateMenuDto.isHidden,
        groupTitle:
          updateMenuDto.groupTitle !== undefined
            ? this.normalizeOptionalString(updateMenuDto.groupTitle)
            : parent?.groupTitle || undefined,
        i18nKey:
          updateMenuDto.i18nKey !== undefined
            ? this.normalizeOptionalString(updateMenuDto.i18nKey)
            : undefined,
        type: updateMenuDto.type !== undefined ? type : undefined,
        permissionCode:
          updateMenuDto.permissionCode !== undefined ? permissionCode : undefined,
      },
    });

    this.logger.log(`更新菜单: ${updated.name} (${updated.path})`);
    return updated;
  }

  /**
   * 构建按分组的菜单列表
   * 直接从数据库记录提取分组信息
   */
  private buildMenuGroups(menus: any[]): MenuGroupDto[] {
    // 直接从数据库记录提取分组信息
    const groupMap = new Map<
      string,
      { title: string; i18nKey?: string; sort: number; items: MenuItemDto[] }
    >();

    // 将菜单添加到对应分组
    for (const menu of menus) {
      const groupKey = menu.groupTitle || "默认";

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          title: menu.groupTitle || "默认",
          i18nKey: menu.groupI18nKey || undefined,
          sort: menu.sort,
          items: [],
        });
      }

      const group = groupMap.get(groupKey)!;
      group.items.push(this.mapToMenuItemDto(menu));
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

  /**
   * 设置菜单父子关系
   * 为相关菜单设置 parentId，形成正确的层级结构
   */
  private async setupMenuParentRelationships(): Promise<void> {
    // 客户中心分组
    const customerCenterGroup = await this.prisma.menu.findFirst({
      where: { path: "/customer-center" },
    });

    if (customerCenterGroup) {
      const customerPaths = ["/customers", "/contacts", "/service-teams"];
      for (const path of customerPaths) {
        await this.prisma.menu.updateMany({
          where: {
            path,
            parentId: null, // 只更新没有父级的菜单
          },
          data: {
            parentId: customerCenterGroup.id,
          },
        });
      }
    }

    // 合同分组
    const contractGroup = await this.prisma.menu.findFirst({
      where: { path: "/contracts-group" },
    });

    if (contractGroup) {
      const contractPaths = ["/contracts", "/contract-templates"];
      for (const path of contractPaths) {
        await this.prisma.menu.updateMany({
          where: {
            path,
            parentId: null,
          },
          data: {
            parentId: contractGroup.id,
          },
        });
      }
    }

    this.logger.log("菜单父子关系设置完成");
  }

  /**
   * 删除菜单
   * 如果菜单下有子菜单/按钮，则拒绝删除
   */
  async deleteMenu(id: string): Promise<void> {
    // 检查菜单是否存在
    const menu = await this.prisma.menu.findUnique({
      where: { id },
    });

    if (!menu) {
      throw new NotFoundException("菜单不存在");
    }

    // 检查是否有子菜单
    const children = await this.prisma.menu.findMany({
      where: { parentId: id },
    });

    if (children.length > 0) {
      throw new BadRequestException("菜单下存在子菜单或按钮，请先删除子项");
    }

    // 删除角色关联
    await this.prisma.roleMenu.deleteMany({
      where: { menuId: id },
    });

    // 删除菜单
    await this.prisma.menu.delete({
      where: { id },
    });

    this.logger.log(`删除菜单: ${menu.name} (${menu.path})`);
  }

  private normalizeOptionalString(value?: string | null): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private normalizeMenuType(type?: string): string {
    const normalized = this.normalizeOptionalString(type) || "menu";
    const allowedTypes = new Set(["menu", "button", "group"]);
    if (!allowedTypes.has(normalized)) {
      throw new BadRequestException("菜单类型不合法");
    }
    return normalized;
  }

  private async assertParentValid(
    currentMenuId: string | null,
    parentId: string | null,
  ) {
    if (!parentId) {
      return null;
    }

    if (currentMenuId && currentMenuId === parentId) {
      throw new BadRequestException("父菜单不能选择自己");
    }

    const parent = await this.prisma.menu.findUnique({
      where: { id: parentId },
    });
    if (!parent) {
      throw new NotFoundException("父菜单不存在");
    }

    if (currentMenuId) {
      let cursor = parent;
      while (cursor.parentId) {
        if (cursor.parentId === currentMenuId) {
          throw new BadRequestException("父菜单不能是当前菜单的子菜单");
        }

        const nextParent = await this.prisma.menu.findUnique({
          where: { id: cursor.parentId },
        });
        if (!nextParent) {
          break;
        }
        cursor = nextParent;
      }
    }

    return parent;
  }
}
