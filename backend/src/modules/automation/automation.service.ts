import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateAutomationRuleDto } from './dto/create-automation-rule.dto';
import { UpdateAutomationRuleDto } from './dto/update-automation-rule.dto';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('automation') private automationQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  /**
   * 创建自动化规则
   */
  async create(createAutomationRuleDto: CreateAutomationRuleDto) {
    return this.prisma.automationRule.create({
      data: createAutomationRuleDto,
    });
  }

  /**
   * 查询所有自动化规则
   */
  async findAll() {
    return this.prisma.automationRule.findMany({
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * 查询单个规则
   */
  async findOne(id: string) {
    return this.prisma.automationRule.findUnique({
      where: { id },
      include: {
        tasks: {
          orderBy: { executedAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  /**
   * 更新规则
   */
  async update(id: string, updateAutomationRuleDto: UpdateAutomationRuleDto) {
    return this.prisma.automationRule.update({
      where: { id },
      data: updateAutomationRuleDto,
    });
  }

  /**
   * 删除规则
   */
  async remove(id: string) {
    return this.prisma.automationRule.delete({
      where: { id },
    });
  }

  /**
   * 启用/禁用规则
   */
  async toggleEnabled(id: string) {
    const rule = await this.findOne(id);
    return this.prisma.automationRule.update({
      where: { id },
      data: { enabled: !rule.enabled },
    });
  }

  /**
   * 手动触发规则
   */
  async triggerRule(id: string) {
    const rule = await this.findOne(id);

    if (!rule.enabled) {
      throw new Error('规则未启用');
    }

    // 添加到队列执行
    await this.automationQueue.add(
      rule.type,
      {
        ruleId: rule.id,
        config: rule.config,
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    return { message: '任务已添加到队列' };
  }

  /**
   * 创建通知
   */
  async createNotification(
    userId: string,
    type: string,
    title: string,
    content: string,
    link?: string,
  ) {
    await this.notificationsQueue.add(
      'create-notification',
      {
        userId,
        type,
        title,
        content,
        link,
      },
      {
        attempts: 3,
      },
    );
  }

  /**
   * 查询用户通知
   */
  async getUserNotifications(userId: string, unreadOnly = false) {
    const where: any = { userId };

    if (unreadOnly) {
      where.isRead = false;
    }

    return this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * 标记通知为已读
   */
  async markNotificationAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        id,
        userId,
      },
      data: {
        isRead: true,
      },
    });
  }

  /**
   * 批量标记通知为已读
   */
  async markAllNotificationsAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  /**
   * 查询任务执行历史
   */
  async getTaskHistory(ruleId?: string, page = 1, pageSize = 20) {
    const where = ruleId ? { ruleId } : {};

    const [total, data] = await Promise.all([
      this.prisma.automationTask.count({ where }),
      this.prisma.automationTask.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { executedAt: 'desc' },
        include: {
          rule: {
            select: {
              name: true,
              type: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      data,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 记录任务执行结果
   */
  async recordTaskExecution(
    ruleId: string,
    status: string,
    result?: any,
    error?: string,
    duration?: number,
  ) {
    return this.prisma.automationTask.create({
      data: {
        ruleId,
        status,
        result: result ? JSON.stringify(result) : null,
        error,
        duration,
      },
    });
  }
}
