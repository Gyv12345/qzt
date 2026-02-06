import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { QueryCustomerDto } from "./dto/query-customer.dto";

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建客户
   */
  async create(createCustomerDto: CreateCustomerDto, userId: string) {
    // 验证跟进人是否存在
    if (createCustomerDto.followUserId) {
      const followUser = await this.prisma.user.findUnique({
        where: { id: createCustomerDto.followUserId },
      });
      if (!followUser) {
        throw new NotFoundException("跟进人不存在");
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
      sortField = "createdAt",
      sortOrder = "desc",
    } = query;

    // 构建查询条件
    const where: Record<string, unknown> = {};

    // 非管理员只能看到自己负责的客户
    if (!isAdmin) {
      where.followUserId = userId;
    }

    // 关键词搜索（搜索公司名称、简称，以及关联的联系人）
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { shortName: { contains: keyword } },
        { code: { contains: keyword } },
        // 通过关联的联系人搜索
        {
          contacts: {
            some: {
              contact: {
                OR: [
                  { name: { contains: keyword } },
                  { phone: { contains: keyword } },
                ],
              },
            },
          },
        },
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
      include: {
        contacts: {
          where: { status: 1 }, // 只返回在职的联系人
          include: {
            contact: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // 查询跟进人信息
    const userIds = Array.from(
      new Set(data.map((c) => c.followUserId).filter(Boolean)),
    );
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        name: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // 组装数据
    const result = data.map((customer) => {
      // 提取联系人信息
      const contacts = customer.contacts.map((cc) => ({
        id: cc.contactId,
        ...cc.contact,
        isPrimary: cc.isPrimary,
        isDecision: cc.isDecision,
      }));

      // 找出主要联系人
      const primaryContact = contacts.find((c) => c.isPrimary);

      return {
        ...customer,
        followUser: customer.followUserId
          ? userMap.get(customer.followUserId)
          : null,
        contacts,
        primaryContact,
        // 兼容旧字段，主要联系人的信息
        contactName:
          primaryContact?.name ||
          (contacts.length > 0 ? contacts[0].name : null),
        contactPhone:
          primaryContact?.phone ||
          (contacts.length > 0 ? contacts[0].phone : null),
        contactEmail:
          primaryContact?.email ||
          (contacts.length > 0 ? contacts[0].email : null),
      };
    });

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
      include: {
        contacts: {
          include: {
            contact: true,
          },
          orderBy: [
            { status: "desc" },
            { isPrimary: "desc" },
            { createdAt: "asc" },
          ],
        },
      },
    });

    if (!customer) {
      throw new NotFoundException("客户不存在");
    }

    // 数据权限验证
    if (!isAdmin && customer.followUserId !== userId) {
      throw new ForbiddenException("无权访问此客户");
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

    // 组装联系人信息
    const contacts = customer.contacts.map((cc) => ({
      id: cc.contactId,
      ...cc.contact,
      isPrimary: cc.isPrimary,
      isDecision: cc.isDecision,
      department: cc.department,
      position: cc.position,
      relation: cc.relation,
      status: cc.status,
      linkedAt: cc.createdAt,
    }));

    const primaryContact = contacts.find((c) => c.isPrimary && c.status === 1);

    return {
      ...customer,
      followUser,
      contacts,
      // 兼容旧字段
      contactName:
        primaryContact?.name || (contacts.length > 0 ? contacts[0].name : null),
      contactPhone:
        primaryContact?.phone ||
        (contacts.length > 0 ? contacts[0].phone : null),
      contactEmail:
        primaryContact?.email ||
        (contacts.length > 0 ? contacts[0].email : null),
    };
  }

  /**
   * 更新客户
   */
  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
    userId: string,
    isAdmin: boolean,
  ) {
    // 检查客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException("客户不存在");
    }

    // 数据权限验证
    if (!isAdmin && customer.followUserId !== userId) {
      throw new ForbiddenException("无权更新此客户");
    }

    // 验证跟进人是否存在
    if (updateCustomerDto.followUserId) {
      const followUser = await this.prisma.user.findUnique({
        where: { id: updateCustomerDto.followUserId },
      });
      if (!followUser) {
        throw new NotFoundException("跟进人不存在");
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
      throw new NotFoundException("客户不存在");
    }

    // 数据权限验证 - 只有管理员可以删除
    if (!isAdmin) {
      throw new ForbiddenException("只有管理员可以删除客户");
    }

    // 删除客户
    await this.prisma.customer.delete({
      where: { id },
    });

    return { message: "删除成功" };
  }

  /**
   * 分配单个客户
   */
  async assignOne(
    customerId: string,
    newFollowUserId: string,
    reason: string,
    operatorId: string,
    isAdmin: boolean,
  ) {
    // 检查客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException("客户不存在");
    }

    // 数据权限验证 - 只有管理员可以分配
    if (!isAdmin) {
      throw new ForbiddenException("只有管理员可以分配客户");
    }

    // 验证跟进人是否存在
    const followUser = await this.prisma.user.findUnique({
      where: { id: newFollowUserId },
    });

    if (!followUser) {
      throw new NotFoundException("跟进人不存在");
    }

    // 使用事务:更新客户并记录分配历史
    const result = await this.prisma.$transaction(async (tx) => {
      // 记录分配历史
      await tx.customerAssignmentHistory.create({
        data: {
          customerId,
          previousFollowUserId: customer.followUserId,
          newFollowUserId,
          assignedBy: operatorId,
          reason,
        },
      });

      // 更新客户
      const updated = await tx.customer.update({
        where: { id: customerId },
        data: {
          followUserId: newFollowUserId,
        },
      });

      return updated;
    });

    return result;
  }

  /**
   * 批量分配客户
   */
  async batchAssign(
    customerIds: string[],
    newFollowUserId: string,
    reason: string,
    operatorId: string,
    isAdmin: boolean,
  ) {
    // 权限验证 - 只有管理员可以批量分配
    if (!isAdmin) {
      throw new ForbiddenException("只有管理员可以批量分配客户");
    }

    // 验证跟进人是否存在
    const followUser = await this.prisma.user.findUnique({
      where: { id: newFollowUserId },
    });

    if (!followUser) {
      throw new NotFoundException("跟进人不存在");
    }

    // 查询所有客户
    const customers = await this.prisma.customer.findMany({
      where: {
        id: { in: customerIds },
      },
    });

    if (customers.length === 0) {
      throw new NotFoundException("未找到任何客户");
    }

    // 使用事务批量更新
    const results = await this.prisma.$transaction(
      customers.map((customer) =>
        this.prisma.customerAssignmentHistory.create({
          data: {
            customerId: customer.id,
            previousFollowUserId: customer.followUserId,
            newFollowUserId,
            assignedBy: operatorId,
            reason,
          },
        }),
      ),
    );

    // 批量更新客户
    await this.prisma.customer.updateMany({
      where: {
        id: { in: customerIds },
      },
      data: {
        followUserId: newFollowUserId,
      },
    });

    return {
      success: true,
      message: `成功分配 ${results.length} 个客户`,
      count: results.length,
    };
  }

  /**
   * 查询客户分配历史
   */
  async getAssignmentHistory(
    customerId: string,
    page: number,
    pageSize: number,
    userId: string,
    isAdmin: boolean,
  ) {
    // 检查客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException("客户不存在");
    }

    // 数据权限验证
    if (!isAdmin && customer.followUserId !== userId) {
      throw new ForbiddenException("无权访问此客户");
    }

    // 计算总数
    const total = await this.prisma.customerAssignmentHistory.count({
      where: { customerId },
    });

    // 查询分配历史
    const histories = await this.prisma.customerAssignmentHistory.findMany({
      where: { customerId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
    });

    // 查询用户信息
    const userIds = Array.from(
      new Set([
        ...histories.map((h) => h.previousFollowUserId).filter(Boolean),
        ...histories.map((h) => h.newFollowUserId),
        ...histories.map((h) => h.assignedBy),
      ]),
    );

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        name: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // 组装数据
    const result = histories.map((history) => ({
      ...history,
      previousFollowUser: history.previousFollowUserId
        ? userMap.get(history.previousFollowUserId)
        : null,
      newFollowUser: userMap.get(history.newFollowUserId),
      assignedByUser: userMap.get(history.assignedBy),
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
   * 查询客户跟进记录
   */
  async getFollowRecords(
    customerId: string,
    page: number,
    pageSize: number,
    userId: string,
    isAdmin: boolean,
  ) {
    // 检查客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException("客户不存在");
    }

    // 数据权限验证
    if (!isAdmin && customer.followUserId !== userId) {
      throw new ForbiddenException("无权访问此客户");
    }

    // 计算总数
    const total = await this.prisma.followRecord.count({
      where: { customerId },
    });

    // 查询跟进记录
    const records = await this.prisma.followRecord.findMany({
      where: { customerId },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        createdAt: "desc",
      },
    });

    // 查询用户信息
    const userIds = Array.from(new Set(records.map((r) => r.userId)));

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        name: true,
        avatar: true,
      },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    // 组装数据
    const result = records.map((record) => ({
      ...record,
      user: userMap.get(record.userId),
    }));

    return {
      data: result,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
