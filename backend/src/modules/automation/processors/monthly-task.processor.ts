import { Processor, WorkerHost, OnQueueEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AutomationService } from '../automation.service';

@Processor('automation')
export class MonthlyTaskProcessor extends WorkerHost {
  private readonly logger = new Logger(MonthlyTaskProcessor.name);

  constructor(
    private prisma: PrismaService,
    private automationService: AutomationService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>, token?: string): Promise<any> {
    if (job.name !== 'MONTHLY_TASK') {
      return;
    }

    this.logger.log('开始生成财务月度待办...');

    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // 查找所有财务人员(这里简化为查找所有用户)
    // 实际应该根据角色筛选
    const financeUsers = await this.prisma.user.findMany({
      where: {
        status: 1,
        roles: {
          some: {
            role: {
              code: {
                contains: 'FINANCE',
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    this.logger.log(`找到财务人员: ${financeUsers.length}个`);

    const results = [];

    for (const user of financeUsers) {
      // 统计当月需要服务的客户
      const activeContracts = await this.prisma.contract.findMany({
        where: {
          serviceStart: {
            lte: new Date(),
          },
          serviceEnd: {
            gte: new Date(),
          },
          status: {
            in: [1, 2],
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 查找本月开票超额的客户
      const overLimitInvoices = await this.prisma.invoice.findMany({
        where: {
          month: currentMonth,
          isOverLimit: true,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 查找即将到期的合同(下月)
      const nextMonth = new Date(today);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const expiringNextMonth = await this.prisma.contract.findMany({
        where: {
          serviceEnd: {
            gte: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1),
            lte: new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 31),
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // 创建月度待办通知
      const taskSummary = {
        activeContractCount: activeContracts.length,
        overLimitCount: overLimitInvoices.length,
        expiringCount: expiringNextMonth.length,
      };

      await this.automationService.createNotification(
        user.id,
        'MONTHLY_TASK',
        `${currentMonth}月度服务任务`,
        `本月需要服务${taskSummary.activeContractCount}个客户,${taskSummary.overLimitCount}个开票超额,${taskSummary.expiringCount}个合同下月到期`,
        '/dashboard',
      );

      results.push({
        userId: user.id,
        userName: user.name,
        ...taskSummary,
      });
    }

    return {
      success: true,
      month: currentMonth,
      totalFinanceUsers: financeUsers.length,
      details: results,
    };
  }

  @OnQueueEvent('active')
  onActive(job: Job) {
    this.logger.log(`处理月度待办生成任务: ${job.id}`);
  }

  @OnQueueEvent('completed')
  onCompleted(job: Job, result: any) {
    this.logger.log(`月度待办生成任务完成: ${job.id}, 结果: ${JSON.stringify(result)}`);
  }

  @OnQueueEvent('failed')
  onError(job: Job, error: Error) {
    this.logger.error(`月度待办生成任务失败: ${job.id}`, error.stack);
  }
}
