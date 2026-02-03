import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AutomationService } from '../automation.service';

@Processor('automation')
export class ContractExpiryProcessor {
  private readonly logger = new Logger(ContractExpiryProcessor.name);

  constructor(
    private prisma: PrismaService,
    private automationService: AutomationService,
  ) {}

  @Process('CONTRACT_EXPIRY')
  async handleContractExpiry(job: Job) {
    this.logger.log('开始检查合同到期情况...');

    // 获取即将到期的合同(30天内、15天内、7天内、1天内)
    const today = new Date();
    const checkDays = [30, 15, 7, 1];

    const results = [];

    for (const days of checkDays) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);

      // 查找即将到期的合同
      const expiringContracts = await this.prisma.contract.findMany({
        where: {
          serviceEnd: {
            gte: new Date(targetDate.setHours(0, 0, 0, 0)),
            lte: new Date(targetDate.setHours(23, 59, 59, 999)),
          },
          status: {
            in: [1, 2], // 部分收款或已收全
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

      this.logger.log(`找到${days}天后到期的合同: ${expiringContracts.length}个`);

      // 为每个即将到期的合同创建通知
      for (const contract of expiringContracts) {
        const { customer } = contract;

        if (customer.followUserId) {
          await this.automationService.createNotification(
            customer.followUserId,
            'CONTRACT_EXPIRY',
            `合同即将到期`,
            `客户 ${customer.name} 的合同将在${days}天后到期,请及时跟进续约。`,
            `/contracts/${contract.id}`,
          );

          results.push({
            contractId: contract.id,
            customerName: customer.name,
            daysUntilExpiry: days,
            notified: true,
          });
        }
      }
    }

    return {
      success: true,
      totalChecked: checkDays.length,
      totalNotified: results.length,
      details: results,
    };
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(`处理合同到期检查任务: ${job.id}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.log(`合同到期检查任务完成: ${job.id}, 结果: ${JSON.stringify(result)}`);
  }

  @OnQueueFailed()
  onError(job: Job, error: Error) {
    this.logger.error(`合同到期检查任务失败: ${job.id}`, error.stack);
  }
}
