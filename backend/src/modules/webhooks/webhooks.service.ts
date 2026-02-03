import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateWebhookConfigDto } from './dto/create-webhook-config.dto';
import { UpdateWebhookConfigDto } from './dto/update-webhook-config.dto';
import { SendWebhookDto } from './dto/send-webhook.dto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 创建 Webhook 配置
   */
  async createConfig(createWebhookConfigDto: CreateWebhookConfigDto) {
    const config = await this.prisma.webhookConfig.create({
      data: createWebhookConfigDto,
    });

    return config;
  }

  /**
   * 获取 Webhook 配置列表
   */
  async findConfigs() {
    return this.prisma.webhookConfig.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 更新 Webhook 配置
   */
  async updateConfig(id: string, updateWebhookConfigDto: UpdateWebhookConfigDto) {
    const existing = await this.prisma.webhookConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Webhook 配置不存在');
    }

    const config = await this.prisma.webhookConfig.update({
      where: { id },
      data: updateWebhookConfigDto,
    });

    return config;
  }

  /**
   * 删除 Webhook 配置
   */
  async removeConfig(id: string) {
    const existing = await this.prisma.webhookConfig.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Webhook 配置不存在');
    }

    await this.prisma.webhookConfig.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  /**
   * 发送 Webhook 消息
   */
  async sendMessage(sendWebhookDto: SendWebhookDto) {
    const { configId, messageType, content } = sendWebhookDto;

    // 获取配置
    const config = await this.prisma.webhookConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new NotFoundException('Webhook 配置不存在');
    }

    if (!config.enabled) {
      throw new Error('Webhook 配置已禁用');
    }

    // 构建消息
    const message = this.buildMessage(config.platform, messageType, content);

    // 发送消息
    const response = await this.sendRequest(config.webhookUrl, message);

    // 记录发送历史
    await this.prisma.webhookMessage.create({
      data: {
        configId: config.id,
        platform: config.platform,
        messageType,
        content: JSON.stringify(content),
        status: response.success ? 'success' : 'failed',
        response: JSON.stringify(response.data),
        error: response.error,
      },
    });

    return {
      success: response.success,
      data: response.data,
      error: response.error,
    };
  }

  /**
   * 测试 Webhook 发送
   */
  async testSend(webhookUrl: string, platform: 'wecom' | 'feishu' | 'dingtalk') {
    // 构建测试消息
    const message = this.buildTestMessage(platform);

    // 发送消息
    const response = await this.sendRequest(webhookUrl, message);

    return {
      success: response.success,
      data: response.data,
      error: response.error,
    };
  }

  /**
   * 构建消息
   */
  private buildMessage(platform: string, messageType: string, content: Record<string, any>) {
    switch (platform) {
      case 'wecom':
        return this.buildWecomMessage(messageType, content);
      case 'feishu':
        return this.buildFeishuMessage(messageType, content);
      case 'dingtalk':
        return this.buildDingtalkMessage(messageType, content);
      default:
        throw new Error(`不支持的平台: ${platform}`);
    }
  }

  /**
   * 构建企业微信消息
   */
  private buildWecomMessage(messageType: string, content: Record<string, any>) {
    const baseMessage = {
      msgtype: messageType,
    };

    switch (messageType) {
      case 'text':
        return { ...baseMessage, text: { content: content.content } };
      case 'markdown':
        return { ...baseMessage, markdown: { content: content.content } };
      case 'card':
        return {
          msgtype: 'template_card',
          template_card: {
            card_type: 'text_notice',
            source: { icon_url: content.iconUrl, desc: content.desc },
            main_title: { title: content.title, desc: content.desc },
            emphasis_content: { title: content.emphasis || '' },
            quote_area: { type: 1, url: content.url, title: content.quoteTitle, desc: content.quoteDesc },
            sub_title_text: content.subtitle,
            horizontal_content_list: content.items || [],
            jump_list: content.jumps || [],
            card_action: { type: 1, url: content.url },
          },
        };
      default:
        return baseMessage;
    }
  }

  /**
   * 构建飞书消息
   */
  private buildFeishuMessage(messageType: string, content: Record<string, any>) {
    switch (messageType) {
      case 'text':
        return {
          msg_type: 'text',
          content: { text: content.content },
        };
      case 'markdown':
        return {
          msg_type: 'interactive',
          card: {
            header: { title: { tag: 'plain_text', content: content.title || 'Markdown' } },
            elements: [{ tag: 'div', text: { tag: 'lark_md', content: content.content } }],
          },
        };
      case 'card':
        return {
          msg_type: 'interactive',
          card: {
            header: { title: { tag: 'plain_text', content: content.title || '' } },
            elements: content.elements || [],
          },
        };
      default:
        return { msg_type: 'text', content: { text: content.content } };
    }
  }

  /**
   * 构建钉钉消息
   */
  private buildDingtalkMessage(messageType: string, content: Record<string, any>) {
    const baseMessage = { msgtype: messageType };

    switch (messageType) {
      case 'text':
        return { ...baseMessage, text: { content: content.content } };
      case 'markdown':
        return { ...baseMessage, markdown: { title: content.title || '消息', text: content.content } };
      case 'card':
        return {
          msgtype: 'actionCard',
          actionCard: {
            title: content.title || '',
            text: content.content,
            btnOrientation: content.btnOrientation || '0',
            btns: content.buttons || [],
          },
        };
      default:
        return baseMessage;
    }
  }

  /**
   * 构建测试消息
   */
  private buildTestMessage(platform: string) {
    const testContent = { content: '这是一条测试消息' };

    switch (platform) {
      case 'wecom':
        return { msgtype: 'text', text: { content: '这是一条测试消息' } };
      case 'feishu':
        return { msg_type: 'text', content: { text: '这是一条测试消息' } };
      case 'dingtalk':
        return { msgtype: 'text', text: { content: '这是一条测试消息' } };
      default:
        return { content: '这是一条测试消息' };
    }
  }

  /**
   * 发送 HTTP 请求
   */
  private async sendRequest(url: string, message: any) {
    try {
      const response = await axios.post(url, message, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });

      // 检查响应
      const isSuccess = this.checkSuccess(response.data);

      return {
        success: isSuccess,
        data: response.data,
        error: null,
      };
    } catch (error: any) {
      this.logger.error(`Webhook 发送失败: ${error.message}`, error.stack);

      return {
        success: false,
        data: error.response?.data || null,
        error: error.message,
      };
    }
  }

  /**
   * 检查响应是否成功
   */
  private checkSuccess(responseData: any): boolean {
    // 企业微信
    if (responseData.errcode !== undefined) {
      return responseData.errcode === 0;
    }

    // 飞书
    if (responseData.code !== undefined) {
      return responseData.code === 0;
    }

    // 钉钉
    if (responseData.errcode !== undefined) {
      return responseData.errcode === 0;
    }

    return true;
  }
}
