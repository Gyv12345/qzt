import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AutomationService } from '../automation.service';

@Processor('automation')
export class NewCustomerFollowProcessor {
  private readonly logger = new Logger(NewCustomerFollowProcessor.name);

  constructor(
    private prisma: PrismaService,
    private automationService: AutomationService,
  ) {}

  @Process('NEW_CUSTOMER_FOLLOW')
  async handleNewCustomerFollow(job: Job) {
    this.logger.log('开始检查新客户跟进情况...');

    // 查找7天内添加的未签约客户
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const newCustomers = await this.prisma.customer.findMany({
      where: {
        createdAt: {
          gte: sevenDaysAgo,
        },
        customerLevel: {
          in: [0, 1], // 潜在客户或意向客户
        },
        followUserId: {
          not: null,
        },
      },
      select: {
        id: true,
        name: true,
        followUserId: true,
        createdAt: true,
        customerLevel: true,
      },
    });

    this.logger.log(`找到新客户: ${newCustomers.length}个`);

    const results = [];

    // 为每个销售创建跟进提醒
    const salesFollowMap = new Map();

    for (const customer of newCustomers) {
      if (!customer.followUserId) continue;

      if (!salesFollowMap.has(customer.followUserId)) {
        salesFollowMap.set(customer.followUserId, []);
      }

      salesFollowMap.get(customer.followUserId).push(customer);
    }

    // 按销售人员分组创建通知
    for (const [salesId, customers] of salesFollowMap.entries()) {
      const customerList = customers
        .map((c) => c.name)
        .join('、');

      await this.automationService.createNotification(
        salesId,
        'NEW_CUSTOMER_FOLLOW',
        `新客户跟进提醒`,
        `您有${customers.length}个新客户待跟进: ${customerList}`,
        '/customers?filter=new',
      );

      results.push({
        salesId,
        customerCount: customers.length,
        customers: customers.map((c) => ({
          id: c.id,
          name: c.name,
          daysSinceCreated: Math.floor(
            (Date.now() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24),
          ),
        })),
      });
    }

    return {
      success: true,
      totalNewCustomers: newCustomers.length,
      totalSales: salesFollowMap.size,
      totalNotified: results.length,
      details: results,
    };
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`处理新客户跟进检查任务: ${job.id}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`新客户跟进检查任务完成: ${job.id}, 结果: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onError(job: Job, error: Error) {
    this.logger.error(`新客户跟进检查任务失败: ${job.id}`, error.stack);
  }
}
