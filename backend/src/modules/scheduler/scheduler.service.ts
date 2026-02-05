import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as cron from 'node-cron';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * 基于 BullMQ + node-cron 的调度服务
 * 替代 @nestjs/schedule，使用 BullMQ 队列处理异步任务
 */
@Injectable()
export class SchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SchedulerService.name);
  private scheduledTasks: cron.ScheduledTask[] = [];

  constructor(
    private prisma: PrismaService,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  onModuleInit() {
    this.logger.log('[调度器] 初始化定时任务...');
    this.setupScheduledTasks();
  }

  onModuleDestroy() {
    this.logger.log('[调度器] 停止所有定时任务');
    this.scheduledTasks.forEach((task) => task.stop());
  }

  /**
   * 设置所有定时任务
   */
  private setupScheduledTasks() {
    // 每小时检查一次待执行的流程节点
    this.scheduleTask('0 * * * *', 'process-pending-flow-nodes', this.processPendingFlowNodes.bind(this));

    // 每天凌晨2点检查合同到期提醒
    this.scheduleTask('0 2 * * *', 'check-contract-expiry', this.checkContractExpiry.bind(this));

    this.logger.log(`[调度器] 已启动 ${this.scheduledTasks.length} 个定时任务`);
  }

  /**
   * 调度任务的辅助方法
   */
  private scheduleTask(cronExpression: string, taskName: string, handler: () => Promise<void>) {
    const task = cron.schedule(cronExpression, async () => {
      try {
        this.logger.debug(`[调度器] 执行任务: ${taskName}`);
        await handler();
      } catch (error) {
        this.logger.error(`[调度器] 任务执行失败: ${taskName}`, error);
      }
    }, {
      timezone: 'Asia/Shanghai',
    });

    this.scheduledTasks.push(task);
    this.logger.log(`[调度器] 已调度任务: ${taskName} (${cronExpression})`);
  }

  /**
   * 每小时检查一次待执行的流程节点
   */
  private async processPendingFlowNodes() {
    this.logger.log('[定时任务] 开始处理待执行的流程节点...');

    try {
      this.logger.log('[定时任务] 当前未启用自动化队列，跳过流程节点处理');
    } catch (error) {
      this.logger.error('[定时任务] 处理流程节点失败', error);
    }
  }

  /**
   * 每天凌晨2点检查合同到期提醒
   */
  private async checkContractExpiry() {
    this.logger.log('[定时任务] 开始检查合同到期...');

    try {
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

      // 查找30天内到期的合同
      const expiringContracts = await this.prisma.contract.findMany({
        where: {
          serviceEnd: {
            lte: thirtyDaysLater,
          },
          status: {
            not: 'PAID',
          },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              followUserId: true,
            },
          },
        },
      });

      this.logger.log(`[定时任务] 发现 ${expiringContracts.length} 个即将到期的合同`);

      // 为每个到期合同创建通知
      for (const contract of expiringContracts) {
        await this.notificationsQueue.add('create-notification', {
          userId: contract.customer.followUserId,
          type: 'CONTRACT_EXPIRY',
          title: '合同到期提醒',
          content: `合同【${contract.contractNo}】将于 ${contract.serviceEnd} 到期，请及时处理`,
          link: `/contracts/${contract.id}`,
        });
      }

      this.logger.log('[定时任务] 合同到期检查完成');
    } catch (error) {
      this.logger.error('[定时任务] 检查合同到期失败', error);
    }
  }

  
}
