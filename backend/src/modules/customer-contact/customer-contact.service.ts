import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AddContactDto, LinkContactDto, UpdateContactRoleDto } from './dto/link-contact.dto';

@Injectable()
export class CustomerContactService {
  constructor(private prisma: PrismaService) {}

  /**
   * 为公司添加联系人（如果联系人不存在则创建）
   */
  async addContact(customerId: string, addDto: AddContactDto, ownerUserId: string) {
    // 检查公司是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('公司不存在');
    }

    // 检查手机号对应的联系人是否存在
    let contact = await this.prisma.contact.findUnique({
      where: { phone: addDto.phone },
    });

    // 如果不存在，创建新联系人
    if (!contact) {
      contact = await this.prisma.contact.create({
        data: {
          name: addDto.name,
          phone: addDto.phone,
          email: addDto.email,
          wechat: addDto.wechat,
          ownerUserId,
        },
      });
    }

    // 检查是否已经关联
    const existing = await this.prisma.customerContact.findUnique({
      where: {
        customerId_contactId: {
          customerId,
          contactId: contact.id,
        },
      },
    });

    if (existing) {
      // 如果已存在但状态为离职，则更新为在职
      if (existing.status === 0) {
        await this.prisma.customerContact.update({
          where: { id: existing.id },
          data: {
            status: 1,
            isPrimary: addDto.isPrimary ?? existing.isPrimary,
            isDecision: addDto.isDecision ?? existing.isDecision,
            department: addDto.department ?? existing.department,
            position: addDto.position ?? existing.position,
            relation: addDto.relation ?? existing.relation,
            remark: addDto.remark ?? existing.remark,
          },
        });
        return {
          message: '关联成功（已恢复离职状态）',
          contact,
          customer,
        };
      }
      throw new ConflictException('该联系人已关联此公司');
    }

    // 如果设置为主要联系人，需要取消其他主要联系人
    if (addDto.isPrimary) {
      await this.prisma.customerContact.updateMany({
        where: {
          customerId,
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
        customerId,
        contactId: contact.id,
        isPrimary: addDto.isPrimary ?? false,
        isDecision: addDto.isDecision ?? false,
        department: addDto.department,
        position: addDto.position,
        relation: addDto.relation,
        remark: addDto.remark,
      },
    });

    return {
      message: '添加成功',
      contact,
      customer,
    };
  }

  /**
   * 关联已有联系人
   */
  async linkContact(customerId: string, linkDto: LinkContactDto) {
    // 检查公司是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('公司不存在');
    }

    // 检查联系人是否存在
    const contact = await this.prisma.contact.findUnique({
      where: { id: linkDto.contactId },
    });

    if (!contact) {
      throw new NotFoundException('联系人不存在');
    }

    // 检查是否已经关联
    const existing = await this.prisma.customerContact.findUnique({
      where: {
        customerId_contactId: {
          customerId,
          contactId: linkDto.contactId,
        },
      },
    });

    if (existing) {
      // 如果已存在但状态为离职，则更新为在职
      if (existing.status === 0) {
        await this.prisma.customerContact.update({
          where: { id: existing.id },
          data: {
            status: 1,
            isPrimary: linkDto.isPrimary ?? existing.isPrimary,
            isDecision: linkDto.isDecision ?? existing.isDecision,
            department: linkDto.department ?? existing.department,
            position: linkDto.position ?? existing.position,
            relation: linkDto.relation ?? existing.relation,
            remark: linkDto.remark ?? existing.remark,
          },
        });
        return { message: '关联成功（已恢复离职状态）' };
      }
      throw new ConflictException('该联系人已关联此公司');
    }

    // 如果设置为主要联系人，需要取消其他主要联系人
    if (linkDto.isPrimary) {
      await this.prisma.customerContact.updateMany({
        where: {
          customerId,
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
        customerId,
        contactId: linkDto.contactId,
        isPrimary: linkDto.isPrimary ?? false,
        isDecision: linkDto.isDecision ?? false,
        department: linkDto.department,
        position: linkDto.position,
        relation: linkDto.relation,
        remark: linkDto.remark,
      },
    });

    return { message: '关联成功' };
  }

  /**
   * 更新联系人角色
   */
  async updateContactRole(customerId: string, contactId: string, updateDto: UpdateContactRoleDto) {
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

    // 如果设置为主要联系人，需要取消其他主要联系人
    if (updateDto.isPrimary && !existing.isPrimary) {
      await this.prisma.customerContact.updateMany({
        where: {
          customerId,
          isPrimary: true,
        },
        data: {
          isPrimary: false,
        },
      });
    }

    // 更新关联
    const updated = await this.prisma.customerContact.update({
      where: {
        customerId_contactId: {
          customerId,
          contactId,
        },
      },
      data: updateDto,
    });

    return updated;
  }

  /**
   * 取消关联（软删除：标记为离职）
   */
  async unlinkContact(customerId: string, contactId: string) {
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
        status: 0,
      },
    });

    return { message: '已取消关联（标记为离职状态）' };
  }

  /**
   * 获取公司的所有联系人
   */
  async getCustomerContacts(customerId: string) {
    const contacts = await this.prisma.customerContact.findMany({
      where: {
        customerId,
      },
      include: {
        contact: true,
      },
      orderBy: [
        { status: 'desc' }, // 在职的排前面
        { isPrimary: 'desc' }, // 主要联系人排前面
        { createdAt: 'asc' },
      ],
    });

    return {
      data: contacts.map((cc) => ({
        ...cc.contact,
        isPrimary: cc.isPrimary,
        isDecision: cc.isDecision,
        department: cc.department,
        position: cc.position,
        relation: cc.relation,
        status: cc.status,
        remark: cc.remark,
        linkedAt: cc.createdAt,
      })),
    };
  }
}
