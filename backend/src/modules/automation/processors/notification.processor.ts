import { Processor, Process, OnQueueActive, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Processor('notifications')
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private prisma: PrismaService) {}

  @Process('create-notification')
  async handleCreateNotification(job: Job) {
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

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.debug(`处理通知创建任务: ${job.id}`);
  }

  @OnQueueCompleted()
  onCompleted(job: Job, result: any) {
    this.logger.debug(`通知创建任务完成: ${job.id}`);
  }

  @OnQueueFailed()
  onError(job: Job, error: Error) {
    this.logger.error(`通知创建任务失败: ${job.id}`, error.stack);
  }
}
