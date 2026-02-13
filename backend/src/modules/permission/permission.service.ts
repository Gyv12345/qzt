import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Injectable()
export class PermissionService {
  private readonly logger = new Logger(PermissionService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 同步前端路由到菜单
   */
  async syncMenus(routes: any[]) {
    const syncedMenus = [];

    for (const route of routes) {
      const existingMenu = await this.prisma.menu.findUnique({
        where: { path: route.path },
      });

      if (existingMenu) {
        // 更新现有菜单
        const updated = await this.prisma.menu.update({
          where: { id: existingMenu.id },
          data: {
            name: route.name || existingMenu.name,
            icon: route.icon || existingMenu.icon,
            sort: route.order || existingMenu.sort,
            enabled:
              route.enabled !== undefined
                ? route.enabled
                : existingMenu.enabled,
          },
        });
        syncedMenus.push(updated);
      } else {
        // 创建新菜单
        const created = await this.prisma.menu.create({
          data: {
            path: route.path,
            name: route.name,
            icon: route.icon,
            sort: route.order || 0,
            enabled: route.enabled !== undefined ? route.enabled : true,
          },
        });
        syncedMenus.push(created);
      }
    }

    this.logger.log(`同步${syncedMenus.length}个菜单`);

    return syncedMenus;
  }

  /**
   * 获取所有菜单(树形结构)
   */
  async getMenuTree() {
    const menus = await this.prisma.menu.findMany({
      where: {
        enabled: true,
      },
      orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
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
   * 更新菜单
   */
  async updateMenu(id: string, data: any) {
    return this.prisma.menu.update({
      where: { id },
      data,
    });
  }

  /**
   * 获取单个菜单详情
   */
  async findOneMenu(id: string) {
    return this.prisma.menu.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });
  }

  /**
   * 删除菜单
   */
  async removeMenu(id: string) {
    // 检查是否有子菜单
    const childrenCount = await this.prisma.menu.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      throw new Error("该菜单下有子菜单，无法删除");
    }

    return this.prisma.menu.delete({
      where: { id },
    });
  }

  /**
   * 创建角色
   */
  async createRole(createRoleDto: CreateRoleDto) {
    const { menuIds, dataScopeDeptIds, ...roleData } = createRoleDto;

    return this.prisma.role.create({
      data: {
        ...roleData,
        type: roleData.type || "system",
        dataScope: roleData.dataScope || "all",
        dataScopeDeptIds: dataScopeDeptIds || null,
        ...(menuIds && {
          menus: {
            create: menuIds.map((menuId) => ({
              menu: { connect: { id: menuId } },
            })),
          },
        }),
      },
      include: {
        menus: {
          include: {
            menu: true,
          },
        },
      },
    });
  }

  /**
   * 查询所有角色
   */
  async findAllRoles() {
    return this.prisma.role.findMany({
      include: {
        menus: {
          include: {
            menu: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  /**
   * 查询单个角色
   */
  async findOneRole(id: string) {
    return this.prisma.role.findUnique({
      where: { id },
      include: {
        menus: {
          include: {
            menu: true,
          },
        },
      },
    });
  }

  /**
   * 更新角色
   */
  async updateRole(id: string, updateRoleDto: UpdateRoleDto) {
    const { menuIds, dataScopeDeptIds, ...roleData } = updateRoleDto;

    // 如果更新菜单,先断开旧的菜单关联
    if (menuIds !== undefined) {
      await this.prisma.roleMenu.deleteMany({
        where: { roleId: id },
      });
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        ...roleData,
        ...(dataScopeDeptIds !== undefined && { dataScopeDeptIds }),
        ...(menuIds && {
          menus: {
            create: menuIds.map((menuId) => ({
              menu: { connect: { id: menuId } },
            })),
          },
        }),
      },
      include: {
        menus: {
          include: {
            menu: true,
          },
        },
      },
    });
  }

  /**
   * 删除角色
   */
  async removeRole(id: string) {
    return this.prisma.role.delete({
      where: { id },
    });
  }

  /**
   * 获取用户的菜单权限（含按钮权限）
   */
  async getUserMenus(userId: string): Promise<any[]> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                menus: {
                  include: {
                    menu: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    // 超级管理员返回所有启用的菜单（仅导航菜单，不含按钮）
    if (user.isSystem) {
      const allMenus = await this.prisma.menu.findMany({
        where: {
          enabled: true,
          type: "menu", // 只返回导航菜单
        },
        orderBy: [{ sort: "asc" }, { createdAt: "desc" }],
      });
      return allMenus;
    }

    // 收集用户的所有菜单ID（去重）
    const menuSet = new Map<string, any>();

    for (const userRole of user.roles) {
      for (const roleMenu of userRole.role.menus) {
        const menu = roleMenu.menu;
        // 只包含导航菜单，不包含按钮权限
        if (
          menu &&
          menu.enabled &&
          menu.type === "menu" &&
          !menuSet.has(menu.id)
        ) {
          menuSet.set(menu.id, menu);
        }
      }
    }

    // 构建树形结构
    const menus = Array.from(menuSet.values());
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
   * 检查用户是否有指定权限（通过 permissionCode）
   */
  async hasPermission(
    userId: string,
    permissionCode: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                menus: {
                  include: {
                    menu: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      return false;
    }

    // 超级管理员拥有所有权限
    if (user.isSystem) {
      return true;
    }

    // 检查用户的角色菜单中是否有匹配的 permissionCode
    for (const userRole of user.roles) {
      for (const roleMenu of userRole.role.menus) {
        if (roleMenu.menu.permissionCode === permissionCode) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * 检查用户是否有多个权限（所有权限都需要满足）
   */
  async hasPermissions(
    userId: string,
    permissionCodes: string[],
  ): Promise<boolean> {
    if (!permissionCodes || permissionCodes.length === 0) {
      return true;
    }

    for (const code of permissionCodes) {
      const has = await this.hasPermission(userId, code);
      if (!has) {
        return false;
      }
    }

    return true;
  }

  /**
   * 获取用户的所有权限代码列表
   */
  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                menus: {
                  include: {
                    menu: true,
                  },
                },
              },
            },
          },
        },
        department: true,
      },
    });

    if (!user) {
      return {
        permissions: [],
        roles: [],
        departmentId: null,
      };
    }

    // 收集所有权限代码
    const permissions = new Set<string>();

    const roles = user.roles.map((userRole) => ({
      id: userRole.role.id,
      name: userRole.role.name,
      code: userRole.role.code,
      type: userRole.role.type,
      dataScope: userRole.role.dataScope,
      dataScopeDeptIds: userRole.role.dataScopeDeptIds,
    }));

    for (const userRole of user.roles) {
      for (const roleMenu of userRole.role.menus) {
        if (roleMenu.menu.permissionCode) {
          permissions.add(roleMenu.menu.permissionCode);
        }
      }
    }

    return {
      permissions: Array.from(permissions),
      roles,
      departmentId: user.departmentId,
    };
  }

  /**
   * 为角色分配菜单
   */
  async assignMenusToRole(roleId: string, menuIds: string[]) {
    // 删除旧的菜单关联
    await this.prisma.roleMenu.deleteMany({
      where: { roleId },
    });

    // 创建新的菜单关联
    for (const menuId of menuIds) {
      await this.prisma.roleMenu.create({
        data: {
          roleId,
          menuId,
        },
      });
    }

    return this.findOneRole(roleId);
  }

  /**
   * 获取角色的菜单列表
   */
  async getRoleMenus(roleId: string): Promise<any[]> {
    const roleMenus = await this.prisma.roleMenu.findMany({
      where: { roleId },
      include: {
        menu: true,
      },
    });

    return roleMenus.map((rm) => rm.menu);
  }

  /**
   * 为用户分配角色
   */
  async assignRolesToUser(userId: string, roleIds: string[]) {
    // 删除旧的角色关联
    await this.prisma.userRole.deleteMany({
      where: { userId },
    });

    // 创建新的角色关联
    for (const roleId of roleIds) {
      await this.prisma.userRole.create({
        data: {
          userId,
          roleId,
        },
      });
    }

    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  /**
   * 初始化超级管理员
   */
  async initializeSuperAdmin() {
    // 检查是否已存在超级管理员
    const existingAdmin = await this.prisma.user.findFirst({
      where: {
        username: "admin",
      },
    });

    if (existingAdmin) {
      this.logger.log("超级管理员已存在");
      return existingAdmin;
    }

    // 创建所有菜单
    const menus = await this.createDefaultMenus();

    // 创建超级管理员角色
    const superAdminRole = await this.prisma.role.create({
      data: {
        name: "超级管理员",
        code: "SUPER_ADMIN",
        description: "系统内置超级管理员,拥有所有权限",
        status: "ACTIVE",
        menus: {
          create: menus.map((m) => ({
            menu: { connect: { id: m.id } },
          })),
        },
      },
    });

    // 创建超级管理员用户
    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = await this.prisma.user.create({
      data: {
        username: "admin",
        password: hashedPassword,
        name: "超级管理员",
        status: "ACTIVE",
        isSystem: true,
        roles: {
          create: {
            roleId: superAdminRole.id,
          },
        },
      },
    });

    this.logger.log("超级管理员初始化完成");
    return admin;
  }

  /**
   * 创建默认菜单和权限
   */
  private async createDefaultMenus() {
    // 默认菜单配置
    const defaultMenus = [
      // 业务模块
      {
        path: "/customers",
        name: "客户管理",
        icon: "Users",
        sort: 1,
        type: "menu",
      },
      {
        path: "/contracts",
        name: "合同管理",
        icon: "FileText",
        sort: 2,
        type: "menu",
      },
      {
        path: "/products",
        name: "产品管理",
        icon: "Package",
        sort: 3,
        type: "menu",
      },
      {
        path: "/invoices",
        name: "发票管理",
        icon: "Receipt",
        sort: 4,
        type: "menu",
      },

      // 系统设置
      {
        path: "/system",
        name: "系统设置",
        icon: "Settings",
        sort: 100,
        type: "menu",
      },
      {
        path: "/system/users",
        name: "用户管理",
        icon: "UserCog",
        parentId: "/system",
        sort: 1,
        type: "menu",
      },
      {
        path: "/system/roles",
        name: "角色管理",
        icon: "Shield",
        parentId: "/system",
        sort: 2,
        type: "menu",
      },
      {
        path: "/system/menus",
        name: "菜单管理",
        icon: "Menu",
        parentId: "/system",
        sort: 3,
        type: "menu",
      },
      {
        path: "/system/departments",
        name: "部门管理",
        icon: "Building",
        parentId: "/system",
        sort: 4,
        type: "menu",
      },
      {
        path: "/system/logs",
        name: "日志管理",
        icon: "FileText",
        parentId: "/system",
        sort: 5,
        type: "menu",
      },
    ];

    // 按钮权限配置
    const defaultPermissions = [
      // 客户管理
      { path: "customer.create", name: "新增客户", type: "button" },
      { path: "customer.update", name: "编辑客户", type: "button" },
      { path: "customer.delete", name: "删除客户", type: "button" },
      { path: "customer.export", name: "导出客户", type: "button" },

      // 合同管理
      { path: "contract.create", name: "新增合同", type: "button" },
      { path: "contract.update", name: "编辑合同", type: "button" },
      { path: "contract.delete", name: "删除合同", type: "button" },

      // 产品管理
      { path: "product.create", name: "新增产品", type: "button" },
      { path: "product.update", name: "编辑产品", type: "button" },
      { path: "product.delete", name: "删除产品", type: "button" },

      // 发票管理
      { path: "invoice.create", name: "新增发票", type: "button" },
      { path: "invoice.update", name: "编辑发票", type: "button" },

      // 系统管理
      { path: "user.create", name: "新增用户", type: "button" },
      { path: "user.update", name: "编辑用户", type: "button" },
      { path: "user.delete", name: "删除用户", type: "button" },
      { path: "role.manage", name: "管理角色", type: "button" },
      { path: "menu.manage", name: "管理菜单", type: "button" },
      { path: "dept.manage", name: "管理部门", type: "button" },
    ];

    const createdMenus = [];

    // 创建菜单
    for (const menuData of defaultMenus) {
      const existing = await this.prisma.menu.findUnique({
        where: { path: menuData.path },
      });

      if (!existing) {
        // 查找父菜单ID
        let parentId = null;
        if (menuData.parentId) {
          const parent = await this.prisma.menu.findUnique({
            where: { path: menuData.parentId },
          });
          parentId = parent?.id || null;
        }

        const created = await this.prisma.menu.create({
          data: {
            path: menuData.path,
            name: menuData.name,
            icon: menuData.icon,
            sort: menuData.sort,
            type: menuData.type,
            enabled: true,
            parentId,
          },
        });
        createdMenus.push(created);
      } else {
        createdMenus.push(existing);
      }
    }

    // 创建按钮权限
    for (const permData of defaultPermissions) {
      const existing = await this.prisma.menu.findUnique({
        where: { path: permData.path },
      });

      if (!existing) {
        const created = await this.prisma.menu.create({
          data: {
            path: permData.path,
            name: permData.name,
            type: permData.type,
            permissionCode: permData.path,
            enabled: true,
          },
        });
        createdMenus.push(created);
      }
    }

    return createdMenus;
  }
}
