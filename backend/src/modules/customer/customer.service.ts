import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { QueryCustomerDto } from './dto/query-customer.dto';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建客户
   */
  async create(createCustomerDto: CreateCustomerDto, userId: string, isAdmin: boolean) {
    // 验证跟进人是否存在
    if (createCustomerDto.followUserId) {
      const followUser = await this.prisma.user.findUnique({
        where: { id: createCustomerDto.followUserId },
      });
      if (!followUser) {
        throw new NotFoundException('跟进人不存在');
      }
    }

    // 如果没有指定跟进人,默认为当前用户
    const data = { ...createCustomerDto };
    if (!data.followUserId) {
      data.followUserId = userId;
    }

    // 创建客户数据
    const customer = await this.prisma.customer.create({
      data,
      include: {
        followRecords: true,
      },
    });

    return customer;
  }

  /**
   * 查询客户列表
   */
  async findAll(query: QueryCustomerDto, userId: string, isAdmin: boolean) {
    const {
      page = 1,
      pageSize = 10,
      keyword,
      customerLevel,
      followUserId,
      sortField = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // 构建查询条件
    const where: any = {};

    // 非管理员只能看到自己负责的客户
    if (!isAdmin) {
      where.followUserId = userId;
    }

    // 关键词搜索
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { contactName: { contains: keyword } },
        { contactPhone: { contains: keyword } },
        { companyName: { contains: keyword } },
      ];
    }

    // 客户等级筛选
    if (customerLevel !== undefined) {
      where.customerLevel = customerLevel;
    }

    // 跟进人筛选 (管理员可以使用)
    if (followUserId && isAdmin) {
      where.followUserId = followUserId;
    }

    // 计算总数
    const total = await this.prisma.customer.count({ where });

    // 查询数据
    const data = await this.prisma.customer.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        [sortField]: sortOrder,
      },
    });

    // 查询跟进人信息
    const userIds = Array.from(new Set(data.map(c => c.followUserId).filter(Boolean)));
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        name: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    // 组装数据
    const result = data.map(customer => ({
      ...customer,
      followUser: customer.followUserId ? userMap.get(customer.followUserId) : null,
    }));

    return {
      data: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 获取客户详情
   */
  async findOne(id: string, userId: string, isAdmin: boolean) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 数据权限验证
    if (!isAdmin && customer.followUserId !== userId) {
      throw new ForbiddenException('无权访问此客户');
    }

    // 查询跟进人信息
    let followUser = null;
    if (customer.followUserId) {
      followUser = await this.prisma.user.findUnique({
        where: { id: customer.followUserId },
        select: {
          id: true,
          username: true,
          name: true,
        },
      });
    }

    return {
      ...customer,
      followUser,
    };
  }

  /**
   * 更新客户
   */
  async update(id: string, updateCustomerDto: UpdateCustomerDto, userId: string, isAdmin: boolean) {
    // 检查客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 数据权限验证
    if (!isAdmin && customer.followUserId !== userId) {
      throw new ForbiddenException('无权更新此客户');
    }

    // 验证跟进人是否存在
    if (updateCustomerDto.followUserId) {
      const followUser = await this.prisma.user.findUnique({
        where: { id: updateCustomerDto.followUserId },
      });
      if (!followUser) {
        throw new NotFoundException('跟进人不存在');
      }
    }

    // 更新客户
    const updated = await this.prisma.customer.update({
      where: { id },
      data: updateCustomerDto,
    });

    return updated;
  }

  /**
   * 删除客户
   */
  async remove(id: string, userId: string, isAdmin: boolean) {
    // 检查客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 数据权限验证 - 只有管理员可以删除
    if (!isAdmin) {
      throw new ForbiddenException('只有管理员可以删除客户');
    }

    // 删除客户
    await this.prisma.customer.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  /**
   * 分配客户
   */
  async assign(id: string, newFollowUserId: string, userId: string, isAdmin: boolean) {
    // 检查客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 数据权限验证 - 只有管理员或当前负责人可以分配
    if (!isAdmin && customer.followUserId !== userId) {
      throw new ForbiddenException('无权分配此客户');
    }

    // 验证跟进人是否存在
    const followUser = await this.prisma.user.findUnique({
      where: { id: newFollowUserId },
    });

    if (!followUser) {
      throw new NotFoundException('跟进人不存在');
    }

    // 分配客户
    const updated = await this.prisma.customer.update({
      where: { id },
      data: {
        followUserId: newFollowUserId,
      },
    });

    return updated;
  }
}
