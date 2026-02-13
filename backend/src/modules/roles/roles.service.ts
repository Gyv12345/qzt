import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

/**
 * 角色管理服务
 *
 * 负责角色的 CRUD 操作以及角色与菜单的关联管理
 */
@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 创建角色
   * @param createRoleDto 角色创建数据
   * @returns 创建的角色（包含关联的菜单）
   */
  async createRole(createRoleDto: CreateRoleDto) {
    const { menuIds, dataScopeDeptIds, ...roleData } = createRoleDto;

    // 检查角色编码是否已存在
    const existingRole = await this.prisma.role.findFirst({
      where: { code: roleData.code },
    });

    if (existingRole) {
      throw new ConflictException(`角色编码 ${roleData.code} 已存在`);
    }

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
   * @returns 所有角色列表
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
   * @param id 角色 ID
   * @returns 角色详情
   */
  async findOneRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        menus: {
          include: {
            menu: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException(`角色 ${id} 不存在`);
    }

    return role;
  }

  /**
   * 更新角色
   * @param id 角色 ID
   * @param updateRoleDto 更新数据
   * @returns 更新后的角色
   */
  async updateRole(id: string, updateRoleDto: UpdateRoleDto) {
    const { menuIds, dataScopeDeptIds, ...roleData } = updateRoleDto;

    // 检查角色是否存在
    await this.findOneRole(id);

    // 如果更新编码，检查是否与其他角色冲突
    if (roleData.code) {
      const existingRole = await this.prisma.role.findFirst({
        where: {
          code: roleData.code,
          id: { not: id },
        },
      });

      if (existingRole) {
        throw new ConflictException(`角色编码 ${roleData.code} 已存在`);
      }
    }

    // 如果更新菜单，先断开旧的菜单关联
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
   * @param id 角色 ID
   * @returns 删除的角色
   */
  async removeRole(id: string) {
    // 检查角色是否存在
    await this.findOneRole(id);

    // 检查是否有用户使用此角色
    const userRoleCount = await this.prisma.userRole.count({
      where: { roleId: id },
    });

    if (userRoleCount > 0) {
      throw new ConflictException(
        `该角色正在被 ${userRoleCount} 个用户使用，无法删除`,
      );
    }

    return this.prisma.role.delete({
      where: { id },
    });
  }

  /**
   * 为角色分配菜单
   * @param roleId 角色 ID
   * @param menuIds 菜单 ID 列表
   * @returns 更新后的角色
   */
  async assignMenusToRole(roleId: string, menuIds: string[]) {
    // 检查角色是否存在
    await this.findOneRole(roleId);

    // 删除旧的菜单关联
    await this.prisma.roleMenu.deleteMany({
      where: { roleId },
    });

    // 创建新的菜单关联
    if (menuIds.length > 0) {
      for (const menuId of menuIds) {
        await this.prisma.roleMenu.create({
          data: {
            roleId,
            menuId,
          },
        });
      }
    }

    return this.findOneRole(roleId);
  }

  /**
   * 获取角色的菜单列表
   * @param roleId 角色 ID
   * @returns 菜单列表
   */
  async getRoleMenus(roleId: string): Promise<any[]> {
    // 检查角色是否存在
    await this.findOneRole(roleId);

    const roleMenus = await this.prisma.roleMenu.findMany({
      where: { roleId },
      include: {
        menu: true,
      },
    });

    return roleMenus.map((rm) => rm.menu);
  }
}
