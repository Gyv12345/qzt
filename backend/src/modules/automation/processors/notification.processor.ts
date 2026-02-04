import { Processor, WorkerHost, OnQueueEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<any, any, string>, token?: string): Promise<any> {
    const { userId, type, title, content, link } = job.data;

    this.logger.log(`创建通知: ${title} -> 用户${userId}`);

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        content,
        link,
      },
    });

    return {
      success: true,
      notificationId: notification.id,
    };
  }

  @OnQueueEvent('active')
  onActive(job: Job) {
    this.logger.debug(`处理通知创建任务: ${job.id}`);
  }

  @OnQueueEvent('completed')
  onCompleted(job: Job, result: any) {
    this.logger.debug(`通知创建任务完成: ${job.id}`);
  }

  @OnQueueEvent('failed')
  onError(job: Job, error: Error) {
    this.logger.error(`通知创建任务失败: ${job.id}`, error.stack);
  }
}
