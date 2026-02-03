import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto, PermissionType } from './dto/create-permission.dto';

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
            enabled: route.enabled !== undefined ? route.enabled : existingMenu.enabled,
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
      include: {
        permissions: true,
      },
      orderBy: {
        sort: 'asc',
        createdAt: 'desc',
      },
    });

    // 构建树形结构
    const buildTree = (parentId: string | null = null) => {
      return menus
        .filter((menu) => menu.parentId === parentId)
        .map((menu) => ({
          ...menu,
          permissions: menu.permissions,
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
   * 创建权限
   */
  async createPermission(createPermissionDto: CreatePermissionDto) {
    return this.prisma.permission.create({
      data: createPermissionDto,
    });
  }

  /**
   * 查询所有权限
   */
  async findAllPermissions(type?: PermissionType) {
    const where = type ? { type } : {};

    return this.prisma.permission.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * 创建角色
   */
  async createRole(createRoleDto: CreateRoleDto) {
    const { permissionIds, ...roleData } = createRoleDto;

    return this.prisma.role.create({
      data: {
        ...roleData,
        ...(permissionIds && {
          permissions: {
            connect: permissionIds.map((id) => ({ id })),
          },
        }),
      },
      include: {
        permissions: true,
      },
    });
  }

  /**
   * 查询所有角色
   */
  async findAllRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: true,
      },
      orderBy: {
        createdAt: 'desc',
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
        permissions: true,
      },
    });
  }

  /**
   * 更新角色
   */
  async updateRole(id: string, updateRoleDto: UpdateRoleDto) {
    const { permissionIds, ...roleData } = updateRoleDto;

    // 如果更新权限,先断开旧的权限关联
    if (permissionIds !== undefined) {
      await this.prisma.role.update({
        where: { id },
        data: {
          permissions: {
            set: [],
          },
        },
      });
    }

    return this.prisma.role.update({
      where: { id },
      data: {
        ...roleData,
        ...(permissionIds && {
          permissions: {
            connect: permissionIds.map((permissionId) => ({ id: permissionId })),
          },
        }),
      },
      include: {
        permissions: true,
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
   * 获取用户的所有权限
   */
  async getUserPermissions(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return [];
    }

    // 收集所有权限代码
    const permissions = new Set<string>();

    for (const userRole of user.roles) {
      for (const permission of userRole.role.permissions) {
        permissions.add(permission.code);
      }
    }

    return Array.from(permissions);
  }

  /**
   * 为角色分配权限
   */
  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    // 删除旧的权限关联
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // 创建新的权限关联
    await this.prisma.role.update({
      where: { id: roleId },
      data: {
        rolePermissions: {
          create: permissionIds.map((permissionId) => ({
            permission: {
              connect: { id: permissionId },
            },
          })),
        },
      },
    });

    return this.findOneRole(roleId);
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
        username: 'admin',
      },
    });

    if (existingAdmin) {
      this.logger.log('超级管理员已存在');
      return existingAdmin;
    }

    // 创建所有权限
    const permissions = await this.createDefaultPermissions();

    // 创建超级管理员角色
    const superAdminRole = await this.prisma.role.create({
      data: {
        name: '超级管理员',
        code: 'SUPER_ADMIN',
        description: '系统内置超级管理员,拥有所有权限',
        status: 1,
        rolePermissions: {
          create: permissions.map((p) => ({
            permission: {
              connect: { id: p.id },
            },
          })),
        },
      },
    });

    // 创建超级管理员用户
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const admin = await this.prisma.user.create({
      data: {
        username: 'admin',
        password: hashedPassword,
        name: '超级管理员',
        status: 1,
        roles: {
          create: {
            roleId: superAdminRole.id,
          },
        },
      },
    });

    this.logger.log('超级管理员初始化完成');
    return admin;
  }

  /**
   * 创建默认权限
   */
  private async createDefaultPermissions() {
    const defaultPermissions = [
      // 客户管理
      { name: '查看客户', code: 'customer.view', type: 'menu' },
      { name: '新增客户', code: 'customer.create', type: 'button' },
      { name: '编辑客户', code: 'customer.update', type: 'button' },
      { name: '删除客户', code: 'customer.delete', type: 'button' },
      { name: '导出客户', code: 'customer.export', type: 'button' },

      // 合同管理
      { name: '查看合同', code: 'contract.view', type: 'menu' },
      { name: '新增合同', code: 'contract.create', type: 'button' },
      { name: '编辑合同', code: 'contract.update', type: 'button' },
      { name: '删除合同', code: 'contract.delete', type: 'button' },

      // 产品管理
      { name: '查看产品', code: 'product.view', type: 'menu' },
      { name: '新增产品', code: 'product.create', type: 'button' },
      { name: '编辑产品', code: 'product.update', type: 'button' },

      // 发票管理
      { name: '查看发票', code: 'invoice.view', type: 'menu' },
      { name: '新增发票', code: 'invoice.create', type: 'button' },

      // 定价管理
      { name: '查看定价', code: 'pricing.view', type: 'menu' },
      { name: '管理定价规则', code: 'pricing.manage', type: 'button' },

      // 自动化任务
      { name: '查看自动化', code: 'automation.view', type: 'menu' },
      { name: '管理自动化', code: 'automation.manage', type: 'button' },

      // 统计分析
      { name: '查看统计', code: 'statistics.view', type: 'menu' },

      // 系统管理
      { name: '查看用户', code: 'user.view', type: 'menu' },
      { name: '新增用户', code: 'user.create', type: 'button' },
      { name: '编辑用户', code: 'user.update', type: 'button' },
      { name: '删除用户', code: 'user.delete', type: 'button' },
      { name: '管理角色', code: 'role.manage', type: 'button' },
      { name: '管理权限', code: 'permission.manage', type: 'button' },
      { name: '管理菜单', code: 'menu.manage', type: 'button' },
    ];

    const createdPermissions = [];

    for (const perm of defaultPermissions) {
      const existing = await this.prisma.permission.findUnique({
        where: { code: perm.code },
      });

      if (!existing) {
        const created = await this.prisma.permission.create({
          data: perm,
        });
        createdPermissions.push(created);
      } else {
        createdPermissions.push(existing);
      }
    }

    return createdPermissions;
  }
}
