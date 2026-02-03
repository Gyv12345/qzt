import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentService {
  private readonly logger = new Logger(DepartmentService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 创建部门
   */
  async create(createDepartmentDto: CreateDepartmentDto) {
    const { parentId, ...data } = createDepartmentDto;

    // 如果指定了父部门，检查父部门是否存在
    if (parentId) {
      const parent = await this.prisma.department.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        throw new NotFoundException('父部门不存在');
      }
    }

    const department = await this.prisma.department.create({
      data: {
        ...data,
        ...(parentId && { parentId }),
      },
    });

    return department;
  }

  /**
   * 获取部门树形结构
   */
  async findTree() {
    // 获取所有部门
    const departments = await this.prisma.department.findMany({
      orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
    });

    // 构建树形结构
    const buildTree = (parentId: string | null = null) => {
      return departments
        .filter((dept) => dept.parentId === parentId)
        .map((dept) => ({
          ...dept,
          children: buildTree(dept.id),
        }));
    };

    return buildTree();
  }

  /**
   * 获取部门详情（包含子部门和用户）
   */
  async findOne(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        children: {
          orderBy: [{ sort: 'asc' }, { createdAt: 'desc' }],
        },
        users: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    return department;
  }

  /**
   * 获取部门下的用户列表
   */
  async findUsers(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    const users = await this.prisma.user.findMany({
      where: { departmentId: id },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  /**
   * 更新部门
   */
  async update(id: string, updateDepartmentDto: UpdateDepartmentDto) {
    const { parentId, ...data } = updateDepartmentDto;

    // 检查部门是否存在
    const existing = await this.prisma.department.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('部门不存在');
    }

    // 如果更新父部门，检查是否存在
    if (parentId !== undefined) {
      // 不能将父部门设置为自己
      if (parentId === id) {
        throw new ConflictException('不能将父部门设置为自己');
      }

      // 检查父部门是否存在
      if (parentId) {
        const parent = await this.prisma.department.findUnique({
          where: { id: parentId },
        });
        if (!parent) {
          throw new NotFoundException('父部门不存在');
        }
      }
    }

    const department = await this.prisma.department.update({
      where: { id },
      data: {
        ...data,
        ...(parentId !== undefined && { parentId }),
      },
    });

    return department;
  }

  /**
   * 删除部门
   */
  async remove(id: string) {
    // 检查部门是否存在
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: {
        children: {
          select: { id: true },
        },
        users: {
          select: { id: true },
        },
      },
    });

    if (!department) {
      throw new NotFoundException('部门不存在');
    }

    // 检查是否有子部门
    if (department.children.length > 0) {
      throw new ConflictException('该部门下有子部门，无法删除');
    }

    // 检查是否有用户
    if (department.users.length > 0) {
      throw new ConflictException('该部门下有用户，无法删除');
    }

    await this.prisma.department.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }
}
