import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";
import { CreateFollowRecordDto } from "./dto/create-follow-record.dto";
import { UpdateFollowRecordDto } from "./dto/update-follow-record.dto";

@Injectable()
export class FollowRecordService {
  constructor(private prisma: PrismaService) {}

  /**
   * 查询跟进记录列表
   */
  async findAll(customerId?: string, page: number = 1, pageSize: number = 10) {
    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (customerId) {
      where.customerId = customerId;
    }

    const [records, total] = await Promise.all([
      this.prisma.followRecord.findMany({
        where,
        skip,
        take: pageSize,
        include: {
          customer: true,
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.followRecord.count({ where }),
    ]);

    return {
      data: records,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 创建跟进记录
   */
  async create(createFollowRecordDto: CreateFollowRecordDto, userId: string) {
    // 验证客户是否存在
    const customer = await this.prisma.customer.findUnique({
      where: { id: createFollowRecordDto.customerId },
    });

    if (!customer) {
      throw new NotFoundException("客户不存在");
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
            avatar: true,
          },
        },
      },
    });

    return followRecord;
  }

  /**
   * 获取跟进记录详情
   */
  async findOne(id: string, userId: string, isAdmin: boolean) {
    const followRecord = await this.prisma.followRecord.findUnique({
      where: { id },
      include: {
        customer: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    if (!followRecord) {
      throw new NotFoundException("跟进记录不存在");
    }

    // 数据权限验证
    if (!isAdmin && followRecord.userId !== userId) {
      throw new ForbiddenException("无权查看此跟进记录");
    }

    return followRecord;
  }

  /**
   * 更新跟进记录
   */
  async update(
    id: string,
    updateFollowRecordDto: UpdateFollowRecordDto,
    userId: string,
  ) {
    // 检查跟进记录是否存在
    const followRecord = await this.prisma.followRecord.findUnique({
      where: { id },
    });

    if (!followRecord) {
      throw new NotFoundException("跟进记录不存在");
    }

    // 数据权限验证 - 只有创建者可以修改
    if (followRecord.userId !== userId) {
      throw new ForbiddenException("无权修改此跟进记录");
    }

    // 更新跟进记录
    const updated = await this.prisma.followRecord.update({
      where: { id },
      data: updateFollowRecordDto,
      include: {
        customer: true,
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            avatar: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * 删除跟进记录
   */
  async remove(id: string, userId: string) {
    // 检查跟进记录是否存在
    const followRecord = await this.prisma.followRecord.findUnique({
      where: { id },
    });

    if (!followRecord) {
      throw new NotFoundException("跟进记录不存在");
    }

    // 数据权限验证 - 只有创建者可以删除
    if (followRecord.userId !== userId) {
      throw new ForbiddenException("无权删除此跟进记录");
    }

    // 删除跟进记录
    await this.prisma.followRecord.delete({
      where: { id },
    });

    return { message: "删除成功" };
  }
}
