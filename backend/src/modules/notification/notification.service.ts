import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

/**
 * 通知服务
 * 支持站内通知和Webhook通知
 */
@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建站内通知
   */
  async create(data: {
    userId: string;
    type: string;
    title: string;
    content: string;
    link?: string;
  }) {
    return this.prisma.notification.create({
      data,
    });
  }

  /**
   * 批量创建通知
   */
  async createBatch(data: {
    userIds: string[];
    type: string;
    title: string;
    content: string;
    link?: string;
  }) {
    const notifications = data.userIds.map((userId) => ({
      userId,
      type: data.type,
      title: data.title,
      content: data.content,
      link: data.link,
    }));

    return this.prisma.notification.createMany({
      data: notifications,
    });
  }

  /**
   * 发送Webhook通知
   */
  async sendWebhook(webhookUrl: string, data: {
    title: string;
    content: string;
    link?: string;
    metadata?: Record<string, any>;
  }) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          msgtype: 'text',
          text: data.content,
          mentioned_list: [],
          card: data.link ? {
            title: data.title,
            description: data.content,
            url: data.link,
            btn_text: '查看详情',
          } : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook发送失败: ${response.statusText}`);
      }

      const result = await response.json();

      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * 发送企业微信通知
   */
  async sendWeChatMessage(webhookUrl: string, data: {
    title: string;
    content: string;
    link?: string;
  }) {
    return this.sendWebhook(webhookUrl, {
      title: data.title,
      content: data.content,
      link: data.link,
      metadata: { type: 'link' },
    });
  }

  /**
   * 发送钉钉通知
   */
  async sendDingTalkMessage(webhookUrl: string, data: {
    title: string;
    content: string;
    link?: string;
  }) {
    return this.sendWebhook(webhookUrl, {
      title: data.title,
      content: data.content,
      link: data.link,
      metadata: { type: 'link' },
    });
  }

  /**
   * 发送飞书通知
   */
  async sendFeishuMessage(webhookUrl: string, data: {
    title: string;
    content: string;
    link?: string;
  }) {
    return this.sendWebhook(webhookUrl, {
      title: data.title,
      content: data.content,
      link: data.link,
      metadata: { type: 'link' },
    });
  }

  /**
   * 获取用户通知
   */
  async getUserNotifications(userId: string, filters?: {
    isRead?: boolean;
    type?: string;
  }) {
    const where: any = { userId };

    if (filters?.isRead !== undefined) {
      where.isRead = filters.isRead;
    }
    if (filters?.type) {
      where.type = filters.type;
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
  async markAsRead(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * 批量标记为已读
   */
  async markBatchAsRead(notificationIds: string[]) {
    return this.prisma.notification.updateMany({
      where: {
        id: { in: notificationIds },
      },
      data: { isRead: true },
    });
  }

  /**
   * 删除通知
   */
  async delete(notificationId: string) {
    return this.prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  /**
   * 获取用户未读通知数量
   */
  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * 发送智能通知（根据配置自动选择渠道）
   */
  async sendSmartNotification(data: {
    userIds: string[];
    type: string;
    title: string;
    content: string;
    link?: string;
    channels?: ('in-app' | 'wechat' | 'dingtalk' | 'feishu')[];
  }) {
    const { userIds, channels = ['in-app'], ...rest } = data;

    const results: any = {
      inApp: null,
      wechat: null,
      dingtalk: null,
      feishu: null,
    };

    // 1. 发送站内通知
    if (channels.includes('in-app')) {
      const inAppNotifications = await this.createBatch({
        userIds,
        ...rest,
      });
      results.inApp = { count: inAppNotifications.count };
    }

    // 2. 如果配置了Webhook通知，发送Webhook
    const webhookChannels = channels.filter(c => c !== 'in-app');
    const webhookConfigs = await this.prisma.webhookConfig.findMany({
      where: {
        enabled: true,
        platform: {
          in: webhookChannels,
        },
      },
    });

    for (const config of webhookConfigs) {
      const result = await this.sendWebhook(config.webhookUrl, rest);
      results[config.platform] = result;
    }

    return results;
  }
}
