import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import * as cron from "node-cron";
import { PrismaService } from "@/common/prisma/prisma.service";
import { ConfigService } from "@nestjs/config";

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
    @InjectQueue("notifications") private notificationsQueue: Queue,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    this.logger.log("[调度器] 初始化定时任务...");
    this.setupScheduledTasks();
  }

  onModuleDestroy() {
    this.logger.log("[调度器] 停止所有定时任务");
    this.scheduledTasks.forEach((task) => task.stop());
  }

  /**
   * 设置所有定时任务
   */
  private setupScheduledTasks() {
    // 每小时检查一次待执行的流程节点
    this.scheduleTask(
      "0 * * * *",
      "process-pending-flow-nodes",
      this.processPendingFlowNodes.bind(this),
    );

    // 每天凌晨2点检查合同到期提醒
    this.scheduleTask(
      "0 2 * * *",
      "check-contract-expiry",
      this.checkContractExpiry.bind(this),
    );

    // 每天凌晨3点清理过期的登录日志
    this.scheduleTask(
      "0 3 * * *",
      "cleanup-old-login-logs",
      this.cleanupOldLoginLogs.bind(this),
    );

    // 每天凌晨3点清理过期的操作日志
    this.scheduleTask(
      "0 3 * * *",
      "cleanup-old-operation-logs",
      this.cleanupOldOperationLogs.bind(this),
    );

    // 每天凌晨1点执行客户规则检查
    this.scheduleTask(
      "0 1 * * *",
      "execute-customer-rules",
      this.executeCustomerRules.bind(this),
    );

    this.logger.log(`[调度器] 已启动 ${this.scheduledTasks.length} 个定时任务`);
  }

  /**
   * 调度任务的辅助方法
   */
  private scheduleTask(
    cronExpression: string,
    taskName: string,
    handler: () => Promise<void>,
  ) {
    const task = cron.schedule(
      cronExpression,
      async () => {
        try {
          this.logger.debug(`[调度器] 执行任务: ${taskName}`);
          await handler();
        } catch (error) {
          this.logger.error(`[调度器] 任务执行失败: ${taskName}`, error);
        }
      },
      {
        timezone: "Asia/Shanghai",
      },
    );

    this.scheduledTasks.push(task);
    this.logger.log(`[调度器] 已调度任务: ${taskName} (${cronExpression})`);
  }

  /**
   * 每小时检查一次待执行的流程节点
   */
  private async processPendingFlowNodes() {
    this.logger.log("[定时任务] 开始处理待执行的流程节点...");

    try {
      this.logger.log("[定时任务] 当前未启用自动化队列，跳过流程节点处理");
    } catch (error) {
      this.logger.error("[定时任务] 处理流程节点失败", error);
    }
  }

  /**
   * 每天凌晨2点检查合同到期提醒
   */
  private async checkContractExpiry() {
    this.logger.log("[定时任务] 开始检查合同到期...");

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
            not: "PAID",
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

      this.logger.log(
        `[定时任务] 发现 ${expiringContracts.length} 个即将到期的合同`,
      );

      // 为每个到期合同创建通知
      for (const contract of expiringContracts) {
        await this.notificationsQueue.add("create-notification", {
          userId: contract.customer.followUserId,
          type: "CONTRACT_EXPIRY",
          title: "合同到期提醒",
          content: `合同【${contract.contractNo}】将于 ${contract.serviceEnd} 到期，请及时处理`,
          link: `/contracts/${contract.id}`,
        });
      }

      this.logger.log("[定时任务] 合同到期检查完成");
    } catch (error) {
      this.logger.error("[定时任务] 检查合同到期失败", error);
    }
  }

  /**
   * 每天凌晨3点清理过期的登录日志
   */
  private async cleanupOldLoginLogs() {
    this.logger.log("[定时任务] 开始清理过期登录日志...");

    try {
      // 获取保留天数配置，默认90天
      const retentionDays = this.configService.get<number>(
        "LOGS_RETENTION_DAYS",
        90,
      );

      // 计算截止日期
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // 删除早于截止日期的日志
      const result = await this.prisma.loginLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(
        `[定时任务] 已清理 ${result.count} 条过期登录日志（保留 ${retentionDays} 天）`,
      );
    } catch (error) {
      this.logger.error("[定时任务] 清理登录日志失败", error);
    }
  }

  /**
   * 每天凌晨3点清理过期的操作日志
   */
  private async cleanupOldOperationLogs() {
    this.logger.log("[定时任务] 开始清理过期操作日志...");

    try {
      // 获取保留天数配置，默认90天
      const retentionDays = this.configService.get<number>(
        "LOGS_RETENTION_DAYS",
        90,
      );

      // 计算截止日期
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      // 删除早于截止日期的日志
      const result = await this.prisma.operationLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoffDate,
          },
        },
      });

      this.logger.log(
        `[定时任务] 已清理 ${result.count} 条过期操作日志（保留 ${retentionDays} 天）`,
      );
    } catch (error) {
      this.logger.error("[定时任务] 清理操作日志失败", error);
    }
  }

  /**
   * 每天凌晨1点执行客户规则检查
   */
  private async executeCustomerRules() {
    this.logger.log("[定时任务] 开始执行客户规则检查...");

    try {
      // 获取所有启用的客户规则
      const enabledRules = await this.prisma.customerRule.findMany({
        where: { enabled: true },
      });

      this.logger.log(`[定时任务] 找到 ${enabledRules.length} 个启用的规则`);

      for (const rule of enabledRules) {
        await this.processCustomerRule(rule);
      }

      this.logger.log("[定时任务] 客户规则检查完成");
    } catch (error) {
      this.logger.error("[定时任务] 执行客户规则失败", error);
    }
  }

  /**
   * 处理单个客户规则
   */
  private async processCustomerRule(rule: {
    id: number;
    code: string;
    title: string;
    daysValue: number;
  }) {
    this.logger.log(`[定时任务] 处理规则: ${rule.code} (${rule.title})`);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const cutoffDate = new Date(today);
    cutoffDate.setDate(cutoffDate.getDate() - rule.daysValue);

    switch (rule.code) {
      case "FOLLOW_DAYS":
        // 检查超过 X 天未跟进的客户
        await this.checkFollowUpRule(rule, cutoffDate);
        break;

      case "NO_CONTACT_DAYS":
        // 检查超过 X 天未联系的客户
        await this.checkNoContactRule(rule, cutoffDate);
        break;

      case "CONTRACT_EXPIRY_DAYS":
        // 合同到期提醒（在 checkContractExpiry 中处理）
        this.logger.log(`[定时任务] ${rule.code} 由合同到期任务处理`);
        break;

      case "PAYMENT_OVERDUE_DAYS":
        // 检查付款逾期
        await this.checkPaymentOverdueRule(rule, cutoffDate);
        break;

      default:
        this.logger.warn(`[定时任务] 未知规则代码: ${rule.code}`);
    }
  }

  /**
   * 检查跟进天数规则
   */
  private async checkFollowUpRule(
    rule: { title: string; daysValue: number },
    cutoffDate: Date,
  ) {
    // 查找超过设置天数未跟进的客户
    const customers = await this.prisma.customer.findMany({
      where: {
        status: 1,
        followRecords: {
          none: {
            createdAt: { gte: cutoffDate },
          },
        },
      },
      include: {
        followRecords: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    this.logger.log(
      `[定时任务] 发现 ${customers.length} 个超过 ${rule.daysValue} 天未跟进的客户`,
    );

    // 为每个客户创建通知（如果有跟进人）
    for (const customer of customers) {
      if (customer.followUserId) {
        const lastFollow = customer.followRecords[0];
        const lastFollowDate = lastFollow
          ? lastFollow.createdAt.toLocaleDateString("zh-CN")
          : "从未跟进";

        await this.notificationsQueue.add("create-notification", {
          userId: customer.followUserId,
          type: "CUSTOMER_FOLLOW_UP",
          title: "客户跟进提醒",
          content: `客户【${customer.name}】已超过 ${rule.daysValue} 天未跟进，上次跟进: ${lastFollowDate}`,
          link: `/customers/${customer.id}`,
        });
      }
    }
  }

  /**
   * 检查未联系天数规则
   */
  private async checkNoContactRule(
    rule: { title: string; daysValue: number },
    cutoffDate: Date,
  ) {
    // 与跟进规则类似，但这里检查所有类型的联系
    const customers = await this.prisma.customer.findMany({
      where: {
        status: 1,
        followRecords: {
          none: {
            createdAt: { gte: cutoffDate },
          },
        },
      },
    });

    this.logger.log(
      `[定时任务] 发现 ${customers.length} 个超过 ${rule.daysValue} 天未联系的客户（流失风险）`,
    );

    for (const customer of customers) {
      if (customer.followUserId) {
        await this.notificationsQueue.add("create-notification", {
          userId: customer.followUserId,
          type: "CUSTOMER_NO_CONTACT",
          title: "客户流失风险提醒",
          content: `客户【${customer.name}】已超过 ${rule.daysValue} 天未联系，存在流失风险`,
          link: `/customers/${customer.id}`,
        });
      }
    }
  }

  /**
   * 检查付款逾期规则
   */
  private async checkPaymentOverdueRule(
    rule: { title: string; daysValue: number },
    cutoffDate: Date,
  ) {
    // 查找逾期未付款的合同
    const overdueContracts = await this.prisma.contract.findMany({
      where: {
        status: { in: ["UNPAID", "PARTIAL"] },
        serviceEnd: { lt: cutoffDate },
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

    this.logger.log(
      `[定时任务] 发现 ${overdueContracts.length} 个逾期未付款的合同`,
    );

    for (const contract of overdueContracts) {
      if (contract.customer.followUserId) {
        await this.notificationsQueue.add("create-notification", {
          userId: contract.customer.followUserId,
          type: "PAYMENT_OVERDUE",
          title: "付款逾期提醒",
          content: `合同【${contract.contractNo}】（客户: ${contract.customer.name}）服务已结束，请及时催收款项`,
          link: `/contracts/${contract.id}`,
        });
      }
    }
  }
}
