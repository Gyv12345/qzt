import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { DataScopeService } from '../permission/services/data-scope.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { QueryContactDto } from './dto/query-contact.dto';
import { LinkCompanyDto } from './dto/link-company.dto';

@Injectable()
export class ContactService {
  constructor(
    private prisma: PrismaService,
    private dataScopeService: DataScopeService,
  ) {}

  /**
   * 创建联系人
   */
  async create(createContactDto: CreateContactDto, userId: string) {
    // 检查手机号是否已存在
    const existing = await this.prisma.contact.findUnique({
      where: { phone: createContactDto.phone },
    });

    if (existing) {
      throw new ConflictException('该手机号已存在');
    }

    // 创建联系人
    const contact = await this.prisma.contact.create({
      data: {
        ...createContactDto,
        ownerUserId: userId,
      },
    });

    return contact;
  }

  /**
   * 查询联系人列表
   */
  async findAll(query: QueryContactDto, dataScope?: { type: string; userIds?: string[]; departmentIds?: string[] }) {
    const {
      page = 1,
      pageSize = 10,
      keyword,
      customerId,
      sortField = 'createdAt',
      sortOrder = 'desc',
    } = query;

    // 构建查询条件
    const where: Record<string, unknown> = {};

    // 关键词搜索（姓名、电话、邮箱）
    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { phone: { contains: keyword } },
        { email: { contains: keyword } },
        { wechat: { contains: keyword } },
      ];
    }

    // 按公司筛选
    if (customerId) {
      where.customerContacts = {
        some: {
          customerId,
          status: 1, // 只查询在职的关联
        },
      };
    }

    const scopedWhere = dataScope
      ? await this.dataScopeService.buildContactWhere(dataScope, where)
      : where;

    // 计算总数
    const total = await this.prisma.contact.count({ where: scopedWhere });

    // 查询数据
    const data = await this.prisma.contact.findMany({
      where: scopedWhere,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: {
        [sortField]: sortOrder,
      },
      include: {
        customerContacts: {
          where: { status: 1 },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                customerLevel: true,
              },
            },
          },
        },
      },
    });

    // 组装数据：添加关联的公司列表
    const result = data.map((contact) => ({
      ...contact,
      companies: contact.customerContacts.map((cc) => ({
        ...cc.customer,
        isPrimary: cc.isPrimary,
        isDecision: cc.isDecision,
        position: cc.position,
        relation: cc.relation,
      })),
      customerContacts: undefined, // 移除原始嵌套数据
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
   * 获取联系人详情
   */
  async findOne(id: string, dataScope?: { type: string; userIds?: string[]; departmentIds?: string[] }) {
    if (dataScope) {
      const canAccess = await this.dataScopeService.canAccess('contact', id, dataScope);
      if (!canAccess) {
        throw new ForbiddenException('无权访问此联系人');
      }
    }

    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        customerContacts: {
          where: { status: 1 },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                shortName: true,
                customerLevel: true,
                industry: true,
                followUserId: true,
              },
            },
          },
          orderBy: {
            isPrimary: 'desc', // 主要联系人排前面
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }

    // 组装数据
    const companies = contact.customerContacts.map((cc) => ({
      id: cc.customerId,
      ...cc.customer,
      isPrimary: cc.isPrimary,
      isDecision: cc.isDecision,
      department: cc.department,
      position: cc.position,
      relation: cc.relation,
      tags: cc.tags,
      remark: cc.remark,
      status: cc.status,
      createdAt: cc.createdAt,
    }));

    return {
      ...contact,
      companies,
      customerContacts: undefined,
    };
  }

  /**
   * 通过手机号查找联系人（用于去重）
   */
  async findByPhone(phone: string) {
    return this.prisma.contact.findUnique({
      where: { phone },
    });
  }

  /**
   * 更新联系人
   */
  async update(id: string, updateContactDto: UpdateContactDto, dataScope?: { type: string; userIds?: string[]; departmentIds?: string[] }) {
    if (dataScope) {
      const canAccess = await this.dataScopeService.canAccess('contact', id, dataScope);
      if (!canAccess) {
        throw new ForbiddenException('无权更新此联系人');
      }
    }

    // 检查联系人是否存在
    const contact = await this.prisma.contact.findUnique({
      where: { id },
    });

    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }

    // 如果要更新手机号，检查新手机号是否已被使用
    if (updateContactDto.phone && updateContactDto.phone !== contact.phone) {
      const existing = await this.prisma.contact.findUnique({
        where: { phone: updateContactDto.phone },
      });

      if (existing) {
        throw new ConflictException('该手机号已被使用');
      }
    }

    // 更新联系人
    const updated = await this.prisma.contact.update({
      where: { id },
      data: updateContactDto,
    });

    return updated;
  }

  /**
   * 删除联系人
   */
  async remove(id: string, dataScope?: { type: string; userIds?: string[]; departmentIds?: string[] }) {
    if (dataScope) {
      const canAccess = await this.dataScopeService.canAccess('contact', id, dataScope);
      if (!canAccess) {
        throw new ForbiddenException('无权删除此联系人');
      }
    }

    // 检查联系人是否存在
    const contact = await this.prisma.contact.findUnique({
      where: { id },
      include: {
        customerContacts: true,
      },
    });

    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }

    // 如果有关联的公司，提示用户
    if (contact.customerContacts.length > 0) {
      throw new ConflictException(
        `该联系人关联了 ${contact.customerContacts.length} 个公司，请先解除关联`,
      );
    }

    // 删除联系人
    await this.prisma.contact.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  /**
   * 关联公司
   */
  async linkCompany(contactId: string, linkDto: LinkCompanyDto, dataScope?: { type: string; userIds?: string[]; departmentIds?: string[] }) {
    if (dataScope) {
      const canAccess = await this.dataScopeService.canAccess('contact', contactId, dataScope);
      if (!canAccess) {
        throw new ForbiddenException('无权关联此联系人');
      }
    }

    // 检查联系人是否存在
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }

    // 检查公司是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: linkDto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('公司不存在');
    }

    // 检查是否已经关联
    const existing = await this.prisma.customerContact.findUnique({
      where: {
        customerId_contactId: {
          customerId: linkDto.customerId,
          contactId,
        },
      },
    });

    if (existing) {
      // 如果已存在但状态为离职，则更新为在职
      if (existing.status === 0) {
        await this.prisma.customerContact.update({
          where: { id: existing.id },
          data: { status: 1, ...linkDto },
        });
        return { message: '关联成功（已恢复离职状态）' };
      }
      throw new ConflictException('该联系人已关联此公司');
    }

    // 如果设置为主要联系人，需要取消其他主要联系人
    if (linkDto.isPrimary) {
      await this.prisma.customerContact.updateMany({
        where: {
          customerId: linkDto.customerId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    // 创建关联
    await this.prisma.customerContact.create({
      data: {
        contactId,
        customerId: linkDto.customerId,
        isPrimary: linkDto.isPrimary ?? false,
        isDecision: linkDto.isDecision ?? false,
        department: linkDto.department,
        position: linkDto.position,
        relation: linkDto.relation,
        tags: linkDto.tags,
        remark: linkDto.remark,
      },
    });

    return { message: '关联成功' };
  }

  /**
   * 取消关联公司
   */
  async unlinkCompany(contactId: string, customerId: string, dataScope?: { type: string; userIds?: string[]; departmentIds?: string[] }) {
    if (dataScope) {
      const canAccess = await this.dataScopeService.canAccess('contact', contactId, dataScope);
      if (!canAccess) {
        throw new ForbiddenException('无权取消此联系人关联');
      }
    }

    // 检查关联是否存在
    const existing = await this.prisma.customerContact.findUnique({
      where: {
        customerId_contactId: {
          customerId,
          contactId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('关联不存在');
    }

    // 软删除：设置状态为离职
    await this.prisma.customerContact.update({
      where: {
        customerId_contactId: {
          customerId,
          contactId,
        },
      },
      data: {
        status: 0, // 离职
      },
    });

    return { message: '已取消关联（标记为离职状态）' };
  }
}
