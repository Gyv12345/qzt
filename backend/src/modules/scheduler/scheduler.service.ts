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
    @InjectQueue('automation') private automationQueue: Queue,
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

    // 每5分钟执行一次自动化规则
    this.scheduleTask('*/5 * * * *', 'execute-automation-rules', this.executeAutomationRules.bind(this));

    // 每天早上9点检查新客户跟进
    this.scheduleTask('0 9 * * *', 'handle-new-customer-follow', this.handleNewCustomerFollow.bind(this));

    // 每天早上10点检查合同到期（通过队列）
    this.scheduleTask('0 10 * * *', 'handle-contract-expiry-queue', this.handleContractExpiryQueue.bind(this));

    // 每月1号上午10点生成财务月度待办
    this.scheduleTask('0 10 1 * *', 'handle-monthly-tasks', this.handleMonthlyTasks.bind(this));

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
      // 获取所有待执行的周期性任务节点
      const pendingExecutions = await this.prisma.productFlowExecution.findMany({
        where: {
          status: 'PENDING',
          executedAt: null,
        },
        include: {
          node: {
            include: {
              flow: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      this.logger.log(`[定时任务] 发现 ${pendingExecutions.length} 个待执行的节点`);

      for (const execution of pendingExecutions) {
        // 添加到队列异步处理
        await this.automationQueue.add('PROCESS_FLOW_NODE', {
          executionId: execution.id,
        });
      }

      this.logger.log('[定时任务] 流程节点处理任务已添加到队列');
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
            not: 2,
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

  /**
   * 每5分钟执行一次自动化规则
   */
  private async executeAutomationRules() {
    this.logger.log('[定时任务] 开始执行自动化规则...');

    try {
      // 获取所有启用的自动化规则
      const rules = await this.prisma.automationRule.findMany({
        where: {
          enabled: true,
        },
        include: {
          tasks: {
            orderBy: { executedAt: 'desc' },
            take: 1,
          },
        },
      });

      this.logger.log(`[定时任务] 发现 ${rules.length} 个启用的自动化规则`);

      for (const rule of rules) {
        // 添加到队列异步处理
        await this.automationQueue.add('EXECUTE_RULE', {
          ruleId: rule.id,
          type: rule.type,
          config: rule.config,
        });
      }

      this.logger.log('[定时任务] 自动化规则执行任务已添加到队列');
    } catch (error) {
      this.logger.error('[定时任务] 执行自动化规则失败', error);
    }
  }

  /**
   * 每天早上9点检查新客户跟进
   */
  private async handleNewCustomerFollow() {
    this.logger.log('[定时任务] 开始执行新客户跟进检查...');

    try {
      await this.automationQueue.add('NEW_CUSTOMER_FOLLOW', {}, {
        attempts: 3,
      });
    } catch (error) {
      this.logger.error('[定时任务] 新客户跟进检查失败:', error);
    }
  }

  /**
   * 每天早上10点检查合同到期（通过队列）
   */
  private async handleContractExpiryQueue() {
    this.logger.log('[定时任务] 开始执行合同到期检查...');

    try {
      await this.automationQueue.add('CONTRACT_EXPIRY', {}, {
        attempts: 3,
      });
    } catch (error) {
      this.logger.error('[定时任务] 合同到期检查失败:', error);
    }
  }

  /**
   * 每月1号上午10点生成财务月度待办
   */
  private async handleMonthlyTasks() {
    this.logger.log('[定时任务] 开始生成财务月度待办...');

    try {
      await this.automationQueue.add('MONTHLY_TASK', {}, {
        attempts: 3,
      });
    } catch (error) {
      this.logger.error('[定时任务] 生成财务月度待办失败:', error);
    }
  }
}
