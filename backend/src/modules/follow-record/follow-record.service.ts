import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateFollowRecordDto } from './dto/create-follow-record.dto';

@Injectable()
export class FollowRecordService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建跟进记录
   */
  async create(createFollowRecordDto: CreateFollowRecordDto, userId: string, isAdmin: boolean) {
    // 验证客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: createFollowRecordDto.customerId },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 创建跟进记录
    const followRecord = await this.prisma.followRecord.create({
      data: {
        ...createFollowRecordDto,
        userId,
      },
      include: {
        customer: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });

    return followRecord;
  }

  /**
   * 根据客户ID获取跟进记录列表
   */
  async findByCustomer(customerId: string, userId: string, isAdmin: boolean) {
    // 验证客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('客户不存在');
    }

    // 数据权限验证
    if (!isAdmin && customer.followUserId !== userId) {
      throw new ForbiddenException('无权查看此客户的跟进记录');
    }

    // 查询跟进记录列表
    const followRecords = await this.prisma.followRecord.findMany({
      where: { customerId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return followRecords;
  }

  /**
   * 删除跟进记录
   */
  async remove(id: string, userId: string, isAdmin: boolean) {
    // 检查跟进记录是否存在
    const followRecord = await this.prisma.followRecord.findUnique({
      where: { id },
    });

    if (!followRecord) {
      throw new NotFoundException('跟进记录不存在');
    }

    // 数据权限验证 - 只有管理员或创建者可以删除
    if (!isAdmin && followRecord.userId !== userId) {
      throw new ForbiddenException('无权删除此跟进记录');
    }

    // 删除跟进记录
    await this.prisma.followRecord.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }
}