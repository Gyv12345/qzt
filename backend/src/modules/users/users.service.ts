import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import * as bcrypt from 'bcrypt';

// 用户选择类型（排除密码）
type UserSelect = Omit<Prisma.UserSelect, 'password'>;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 创建用户
   */
  async create(createUserDto: CreateUserDto) {
    const { username, password, roleIds, ...userData } = createUserDto;

    // 检查用户名是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException('用户名已存在');
    }

    // 如果提供了邮箱，检查邮箱是否已存在
    if (userData.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: userData.email },
      });
      if (existingEmail) {
        throw new ConflictException('邮箱已被使用');
      }
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        ...userData,
        username,
        password: hashedPassword,
        ...(roleIds && {
          roles: {
            create: roleIds.map((roleId) => ({ roleId })),
          },
        }),
      },
      select: this.getUserSelect(),
    });

    return user;
  }

  /**
   * 分页查询用户列表
   */
  async findAll(query: QueryUserDto) {
    const { page = 1, pageSize = 10, search, departmentId, status, roleId } = query;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (status !== undefined) {
      where.status = status;
    }

    if (roleId) {
      where.roles = {
        some: {
          roleId,
        },
      };
    }

    // 查询总数
    const total = await this.prisma.user.count({ where });

    // 查询数据
    const data = await this.prisma.user.findMany({
      where,
      skip,
      take: pageSize,
      select: this.getUserSelect(),
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取用户详情
   */
  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...this.getUserSelect(),
        roles: {
          select: {
            role: {
              select: {
                id: true,
                name: true,
                code: true,
                description: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        id: true,
                        name: true,
                        code: true,
                        type: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  /**
   * 更新用户
   */
  async update(id: string, updateUserDto: UpdateUserDto) {
    const { username, password, roleIds, email, ...userData } = updateUserDto;

    // 检查用户是否存在
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    // 如果更新用户名，检查是否冲突
    if (username && username !== existingUser.username) {
      const conflictUser = await this.prisma.user.findUnique({
        where: { username },
      });
      if (conflictUser) {
        throw new ConflictException('用户名已存在');
      }
    }

    // 如果更新邮箱，检查是否冲突
    if (email && email !== existingUser.email) {
      const conflictEmail = await this.prisma.user.findUnique({
        where: { email },
      });
      if (conflictEmail) {
        throw new ConflictException('邮箱已被使用');
      }
    }

    // 系统用户的角色不能修改
    if (existingUser.isSystem && roleIds !== undefined) {
      throw new ConflictException('系统用户的角色不能修改');
    }

    // 如果更新密码，进行哈希
    let hashedPassword;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // 如果更新角色，先删除旧的角色关联
    if (roleIds !== undefined) {
      await this.prisma.userRole.deleteMany({
        where: { userId: id },
      });
    }

    // 更新用户
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...userData,
        ...(username && { username }),
        ...(email && { email }),
        ...(hashedPassword && { password: hashedPassword }),
        ...(roleIds && {
          roles: {
            create: roleIds.map((roleId) => ({ roleId })),
          },
        }),
      },
      select: this.getUserSelect(),
    });

    return user;
  }

  /**
   * 删除用户
   */
  async remove(id: string) {
    // 检查用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        isSystem: true,
        customers: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 系统用户不能删除
    if (user.isSystem) {
      throw new ConflictException('系统用户不能删除');
    }

    // 检查是否有关联的客户
    if (user.customers.length > 0) {
      throw new ConflictException('该用户有关联的客户，无法删除');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  /**
   * 重置密码
   */
  async resetPassword(id: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: {
        password: hashedPassword,
      },
    });

    return { message: '密码重置成功' };
  }

  /**
   * 获取用户选择配置（排除密码）
   */
  private getUserSelect(): UserSelect {
    return {
      id: true,
      username: true,
      name: true,
      email: true,
      phone: true,
      avatar: true,
      departmentId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      roles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
    };
  }
}
