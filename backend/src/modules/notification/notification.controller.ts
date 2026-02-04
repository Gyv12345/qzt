import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationService } from './notification.service';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: '获取当前用户通知' })
  async getUserNotifications(
    @Param('userId') userId: string,
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
  ) {
    return this.notificationService.getUserNotifications(userId, {
      isRead: isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      type,
    });
  }

  @Get(':id/unread-count')
  @ApiOperation({ summary: '获取未读通知数量' })
  async getUnreadCount(@Param('id') userId: string) {
    const count = await this.notificationService.getUnreadCount(userId);
    return { count };
  }

  @Post(':id/read')
  @ApiOperation({ summary: '标记通知为已读' })
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Post('read-all')
  @ApiOperation({ summary: '标记所有通知为已读' })
  async markAllAsRead(@Param('id') userId: string) {
    // 获取用户所有未读通知
    const notifications = await this.notificationService.getUserNotifications(
      userId,
      { isRead: false },
    );

    const notificationIds = notifications.map((n) => n.id);

    return this.notificationService.markBatchAsRead(notificationIds);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除通知' })
  async deleteNotification(@Param('id') id: string) {
    return this.notificationService.delete(id);
  }

  @Post('send')
  @ApiOperation({ summary: '发送通知' })
  async sendNotification(@Body() data: {
    userIds: string[];
    type: string;
    title: string;
    content: string;
    link?: string;
    channels?: ('in-app' | 'wechat' | 'dingtalk' | 'feishu')[];
  }) {
    return this.notificationService.sendSmartNotification(data);
  }

  @Post('test-webhook')
  @ApiOperation({ summary: '测试Webhook发送' })
  async testWebhook(@Body() data: {
    webhookUrl: string;
    platform: 'wechat' | 'dingtalk' | 'feishu';
    title: string;
    content: string;
    link?: string;
  }) {
    const methods = {
      wechat: 'sendWeChatMessage',
      dingtalk: 'sendDingTalkMessage',
      feishu: 'sendFeishuMessage',
    };

    return this.notificationService[methods[data.platform]](
      data.webhookUrl,
      data,
    );
  }
}
