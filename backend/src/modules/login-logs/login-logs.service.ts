import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QueryLoginLogDto } from './dto/query-login-log.dto';

@Injectable()
export class LoginLogsService {
  private readonly logger = new Logger(LoginLogsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 分页查询登录日志
   */
  async findLoginLogs(query: QueryLoginLogDto) {
    const { page = 1, pageSize = 10, userId, username, status, startDate, endDate } = query;
    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: Prisma.LoginLogWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (username) {
      where.username = { contains: username };
    }

    if (status) {
      where.status = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDateTime;
      }
    }

    // 查询总数
    const total = await this.prisma.loginLog.count({ where });

    // 查询数据
    const data = await this.prisma.loginLog.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
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
   * 获取登录日志详情
   */
  async findOne(id: string) {
    return this.prisma.loginLog.findUnique({
      where: { id },
    });
  }

  /**
   * 创建登录日志（供其他服务调用）
   */
  async createLoginLog(data: {
    userId: string;
    username: string;
    email?: string;
    ip?: string;
    userAgent?: string;
    browser?: string;
    os?: string;
    status: string;
    failReason?: string;
  }) {
    return this.prisma.loginLog.create({
      data,
    });
  }
}
