import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * 定时任务调度服务
 * 负责处理周期性任务和自动化任务
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 每小时检查一次待执行的流程节点
   */
  @Cron(CronExpression.EVERY_HOUR)
  async processPendingFlowNodes() {
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
        await this.processFlowExecution(execution);
      }

      this.logger.log('[定时任务] 流程节点处理完成');
    } catch (error) {
      this.logger.error('[定时任务] 处理流程节点失败', error);
    }
  }

  /**
   * 每天凌晨2点检查合同到期提醒
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async checkContractExpiry() {
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
            not: 2, // 排除已完成的
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

      this.logger.log(`[定时任务] 发现 ${expiringContracts.length} 个即将到期的合同`);

      // 为每个到期合同创建通知
      for (const contract of expiringContracts) {
        await this.createExpiryNotification(contract);
      }

      this.logger.log('[定时任务] 合同到期检查完成');
    } catch (error) {
      this.logger.error('[定时任务] 检查合同到期失败', error);
    }
  }

  /**
   * 每5分钟执行一次自动化规则
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async executeAutomationRules() {
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
        await this.executeAutomationRule(rule);
      }

      this.logger.log('[定时任务] 自动化规则执行完成');
    } catch (error) {
      this.logger.error('[定时任务] 执行自动化规则失败', error);
    }
  }

  /**
   * 处理单个流程执行
   */
  private async processFlowExecution(execution: any) {
    const { node, contractId, customerId } = execution;

    try {
      // 更新状态为执行中
      await this.prisma.productFlowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'RUNNING',
          executedAt: new Date(),
        },
      });

      // 根据节点类型执行不同的逻辑
      if (node.type === 'NOTIFY') {
        await this.executeNotifyNode(node, contractId, customerId);
      } else if (node.type === 'TASK') {
        await this.executeTaskNode(node, contractId, customerId);
      } else if (node.type === 'APPROVE') {
        await this.executeApproveNode(node, contractId, customerId);
      }

      // 更新状态为成功
      await this.prisma.productFlowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
        },
      });

      this.logger.log(`[流程执行] 节点 ${node.name} 执行成功`);
    } catch (error) {
      // 更新状态为失败
      await this.prisma.productFlowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          error: error.message,
        },
      });

      this.logger.error(`[流程执行] 节点 ${node.name} 执行失败`, error);
    }
  }

  /**
   * 执行通知节点
   */
  private async executeNotifyNode(node: any, contractId: string, customerId: string) {
    let notifyConfig;

    try {
      notifyConfig = JSON.parse(node.notifyConfig || '{}');
    } catch {
      notifyConfig = {};
    }

    // 创建通知
    await this.prisma.notification.create({
      data: {
        userId: customerId, // 这里应该是客户的负责人ID，需要根据业务调整
        type: 'SERVICE',
        title: notifyConfig.title || `服务通知：${node.name}`,
        content: notifyConfig.content || `您的服务节点【${node.name}】已触发`,
        link: notifyConfig.link,
      },
    });

    // 如果配置了Webhook通知
    if (notifyConfig.webhookEnabled) {
      // TODO: 发送Webhook通知
    }
  }

  /**
   * 执行任务节点
   */
  private async executeTaskNode(node: any, contractId: string, customerId: string) {
    let config;

    try {
      config = JSON.parse(node.config || '{}');
    } catch {
      config = {};
    }

    this.logger.log(`[任务节点] 执行任务：${node.name}`, config);

    // 根据配置执行具体任务
    // 这里可以扩展更多的任务类型
    if (config.action === 'UPDATE_CONTRACT_STATUS') {
      // 更新合同状态
      // await this.prisma.contract.update({...})
    }
  }

  /**
   * 执行审批节点
   */
  private async executeApproveNode(node: any, contractId: string, customerId: string) {
    this.logger.log(`[审批节点] 创建审批任务：${node.name}`, { contractId, customerId });

    // 创建待办任务通知给审批人
    if (node.roleId) {
      // 获取角色下的所有用户
      const roleUsers = await this.prisma.user.findMany({
        where: {
          roles: {
            some: {
              roleId: node.roleId,
            },
          },
          status: 1,
        },
      });

      for (const user of roleUsers) {
        await this.prisma.notification.create({
          data: {
            userId: user.id,
            type: 'APPROVE',
            title: `审批任务：${node.name}`,
            content: `您有一个待审批的任务需要处理`,
            link: `/contracts/${contractId}`,
          },
        });
      }
    }
  }

  /**
   * 执行自动化规则
   */
  private async executeAutomationRule(rule: any) {
    this.logger.log(`[自动化规则] 执行规则：${rule.name}`);

    // 根据规则类型执行不同的逻辑
    switch (rule.type) {
      case 'CONTRACT_EXPIRY':
        await this.handleContractExpiryRule(rule);
        break;
      case 'NEW_CUSTOMER_FOLLOW':
        await this.handleNewCustomerFollowRule(rule);
        break;
      case 'MONTHLY_TASK':
        await this.handleMonthlyTaskRule(rule);
        break;
      // 更多规则类型...
    }
  }

  /**
   * 处理合同到期规则
   */
  private async handleContractExpiryRule(rule: any) {
    let config;

    try {
      config = JSON.parse(rule.config || '{}');
    } catch {
      config = {};
    }

    // 查找即将到期的合同
    const daysBeforeExpiry = config.daysBeforeExpiry || 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysBeforeExpiry);

    const contracts = await this.prisma.contract.findMany({
      where: {
        serviceEnd: {
          lte: expiryDate,
        },
        status: {
          not: 2,
        },
      },
    });

    // 为每个合同创建通知
    for (const contract of contracts) {
      await this.createExpiryNotification(contract, config);
    }
  }

  /**
   * 处理新客户跟进规则
   */
  private async handleNewCustomerFollowRule(rule: any) {
    let config;

    try {
      config = JSON.parse(rule.config || '{}');
    } catch {
      config = {};
    }

    // 查找最近创建的客户
    const recentCustomers = await this.prisma.customer.findMany({
      where: {
        createdAt: {
          gte: config.lastHours ? new Date(Date.now() - config.lastHours * 60 * 60 * 1000) : new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    // 为销售创建跟进任务
    for (const customer of recentCustomers) {
      if (customer.followUserId) {
        await this.prisma.notification.create({
          data: {
            userId: customer.followUserId,
            type: 'FOLLOW_UP',
            title: '新客户跟进',
            content: `客户【${customer.name}】需要跟进`,
            link: `/customers/${customer.id}`,
          },
        });
      }
    }
  }

  /**
   * 处理月度任务规则
   */
  private async handleMonthlyTaskRule(rule: any) {
    let config;

    try {
      config = JSON.parse(rule.config || '{}');
    } catch {
      config = {};
    }

    // 检查本月是否已执行
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const lastExecution = await this.prisma.automationTask.findFirst({
      where: {
        ruleId: rule.id,
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), 1),
        },
      },
    });

    if (lastExecution) {
      this.logger.log(`[月度任务] ${rule.name} 本月已执行过`);
      return;
    }

    // 执行月度任务
    await this.prisma.automationTask.create({
      data: {
        ruleId: rule.id,
        status: 'SUCCESS',
        result: JSON.stringify({
          month: currentMonth,
          executedAt: now.toISOString(),
        }),
      },
    });
  }

  /**
   * 创建合同到期通知
   */
  private async createExpiryNotification(contract: any, config: any = {}) {
    // 通知合同负责人
    if (contract.customer.followUserId) {
      await this.prisma.notification.create({
        data: {
          userId: contract.customer.followUserId,
          type: 'CONTRACT_EXPIRY',
          title: '合同到期提醒',
          content: `合同【${contract.contractNo}】将于 ${contract.serviceEnd} 到期，请及时处理`,
          link: `/contracts/${contract.id}`,
        },
      });
    }
  }
}
