# Webhook通知集成实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 创建全局Webhook服务，集成到各个业务模块，支持企业微信、钉钉、飞书的消息推送

**Architecture:**
- 创建全局WebhookService（Common模块）
- 支持消息模板和变量替换
- 集成到自动化规则、产品流程、支付、合同等模块
- 实现优先级队列和失败重试

**Tech Stack:**
- NestJS Global Services
- Axios for HTTP requests
- Prisma for logging

---

## Task 1: 创建全局Webhook服务

**Files:**
- Create: `backend/src/common/services/webhook.service.ts`
- Create: `backend/src/common/services/index.ts`
- Modify: `backend/src/common/common.module.ts`

**Step 1: 创建全局Webhook服务**

```typescript
// backend/src/common/services/webhook.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';

interface WebhookMessage {
  configId: string;
  messageType: 'text' | 'markdown' | 'card';
  content: Record<string, any>;
  priority?: 'urgent' | 'normal' | 'low';
}

interface TemplateVariables {
  customerName?: string;
  contractNo?: string;
  amount?: number;
  date?: string;
  url?: string;
  [key: string]: any;
}

@Injectable()
export class CommonWebhookService {
  private readonly logger = new Logger(CommonWebhookService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('webhooks') private webhookQueue: Queue,
  ) {}

  /**
   * 发送Webhook消息（异步）
   */
  async sendMessage(message: WebhookMessage) {
    const { configId, messageType, content, priority = 'normal' } = message;

    // 添加到队列
    await this.webhookQueue.add(
      'send-webhook',
      {
        configId,
        messageType,
        content,
        priority,
        timestamp: new Date(),
      },
      {
        priority: this.getPriorityValue(priority),
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    );

    this.logger.log(`Webhook message queued: ${configId}`);
  }

  /**
   * 发送Webhook消息（同步，用于测试）
   */
  async sendSync(configId: string, messageType: string, content: Record<string, any>) {
    const config = await this.prisma.webhookConfig.findUnique({
      where: { id: configId },
    });

    if (!config) {
      throw new Error(`Webhook config not found: ${configId}`);
    }

    if (!config.enabled) {
      throw new Error(`Webhook config is disabled: ${configId}`);
    }

    const message = this.buildMessage(config.platform, messageType, content);

    try {
      const response = await axios.post(config.webhookUrl, message, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });

      const isSuccess = this.checkSuccess(response.data, config.platform);

      // 记录发送历史
      await this.prisma.webhookMessage.create({
        data: {
          configId: config.id,
          platform: config.platform,
          messageType,
          content: JSON.stringify(content),
          status: isSuccess ? 'success' : 'failed',
          response: JSON.stringify(response.data),
        },
      });

      return { success: isSuccess, data: response.data };
    } catch (error: any) {
      this.logger.error(`Webhook send failed: ${error.message}`);

      // 记录失败
      await this.prisma.webhookMessage.create({
        data: {
          configId: config.id,
          platform: config.platform,
          messageType,
          content: JSON.stringify(content),
          status: 'failed',
          error: error.message,
          response: JSON.stringify(error.response?.data || null),
        },
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * 使用模板发送消息
   */
  async sendTemplate(
    templateCode: string,
    variables: TemplateVariables,
    priority?: 'urgent' | 'normal' | 'low',
  ) {
    // 查找启用的配置
    const configs = await this.prisma.webhookConfig.findMany({
      where: { enabled: true },
    });

    // 查找模板（暂时硬编码，后续从数据库读取）
    const template = this.getTemplate(templateCode);

    // 替换变量
    const content = this.replaceVariables(template, variables);

    // 并发发送到所有启用的配置
    const promises = configs.map((config) =>
      this.sendMessage({
        configId: config.id,
        messageType: template.messageType,
        content,
        priority,
      }),
    );

    await Promise.allSettled(promises);
  }

  /**
   * 构建消息
   */
  private buildMessage(
    platform: string,
    messageType: string,
    content: Record<string, any>,
  ) {
    switch (platform) {
      case 'wecom':
        return this.buildWecomMessage(messageType, content);
      case 'feishu':
        return this.buildFeishuMessage(messageType, content);
      case 'dingtalk':
        return this.buildDingtalkMessage(messageType, content);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
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
            quote_area: {
              type: 1,
              url: content.url,
              title: content.quoteTitle,
              desc: content.quoteDesc,
            },
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
            header: {
              title: { tag: 'plain_text', content: content.title || 'Markdown' },
            },
            elements: [
              { tag: 'div', text: { tag: 'lark_md', content: content.content } },
            ],
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
        return {
          ...baseMessage,
          markdown: { title: content.title || '消息', text: content.content },
        };
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
   * 替换模板变量
   */
  private replaceVariables(
    template: any,
    variables: TemplateVariables,
  ): Record<string, any> {
    const content = JSON.parse(JSON.stringify(template.content));

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{${key}}`;
      this.replaceInObject(content, placeholder, value);
    }

    return content;
  }

  /**
   * 递归替换对象中的字符串
   */
  private replaceInObject(obj: any, placeholder: string, value: any) {
    if (typeof obj === 'string') {
      return obj.replace(new RegExp(placeholder, 'g'), String(value));
    }

    if (Array.isArray(obj)) {
      return obj.forEach((item) => this.replaceInObject(item, placeholder, value));
    }

    if (typeof obj === 'object' && obj !== null) {
      Object.values(obj).forEach((val) =>
        this.replaceInObject(val, placeholder, value),
      );
    }
  }

  /**
   * 获取模板（临时硬编码，后续从数据库读取）
   */
  private getTemplate(code: string): any {
    const templates: Record<string, any> = {
      CONTRACT_EXPIRE: {
        messageType: 'text',
        content: {
          content: '合同【{contractNo}】即将到期，请及时处理',
        },
      },
      PAYMENT_SUCCESS: {
        messageType: 'text',
        content: {
          content: '收到客户【{customerName}】支付金额 ¥{amount}',
        },
      },
      TASK_ASSIGNED: {
        messageType: 'text',
        content: {
          content: '您有一个新的待办任务需要处理',
        },
      },
    };

    return templates[code] || templates.TASK_ASSIGNED;
  }

  /**
   * 检查响应是否成功
   */
  private checkSuccess(responseData: any, platform: string): boolean {
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

  /**
   * 获取优先级数值（Bull队列）
   */
  private getPriorityValue(priority: string): number {
    const priorityMap: Record<string, number> = {
      urgent: 1,
      normal: 5,
      low: 10,
    };

    return priorityMap[priority] || 5;
  }
}
```

**Step 2: 创建Common服务导出**

```typescript
// backend/src/common/services/index.ts
export * from './webhook.service';
```

**Step 3: 更新Common模块**

```typescript
// backend/src/common/common.module.ts
import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { CommonWebhookService } from './services/webhook.service';

@Global()
@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'webhooks',
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
  ],
  providers: [CommonWebhookService],
  exports: [CommonWebhookService],
})
export class CommonModule {}
```

**Step 4: 创建Webhook队列处理器**

```typescript
// backend/src/common/processors/webhook.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { CommonWebhookService } from '../services/webhook.service';

@Processor('webhooks')
export class WebhookProcessor {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(private webhookService: CommonWebhookService) {}

  @Process('send-webhook')
  async handleSendWebhook(job: Job) {
    const { configId, messageType, content } = job.data;

    this.logger.log(`Processing webhook: ${configId}`);

    try {
      const result = await this.webhookService.sendSync(
        configId,
        messageType,
        content,
      );

      if (result.success) {
        this.logger.log(`Webhook sent successfully: ${configId}`);
      } else {
        this.logger.error(`Webhook send failed: ${result.error}`);
        throw new Error(result.error);
      }
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`);
      throw error;
    }
  }
}
```

**Step 5: 注册Processor到CommonModule**

```typescript
// backend/src/common/common.module.ts
import { WebhookProcessor } from './processors/webhook.processor';

@Global()
@Module({
  // ...
  providers: [CommonWebhookService, WebhookProcessor],
  // ...
})
export class CommonModule {}
```

**Step 6: 测试Webhook服务**

Run: `pnpm run start:dev`

**Step 7: 提交变更**

```bash
git add src/common/
git commit -m "feat: 创建全局Webhook服务

- CommonWebhookService: 全局Webhook服务
- 支持企业微信、钉钉、飞书
- 异步队列处理
- 模板变量替换
- 失败自动重试

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: 集成到自动化规则引擎

**Files:**
- Modify: `backend/src/modules/rule-engine/services/workflow-executor.service.ts`

**Step 1: 注入Webhook服务**

```typescript
// backend/src/modules/rule-engine/services/workflow-executor.service.ts
import { CommonWebhookService } from '@/common/services/webhook.service';

export class WorkflowExecutorService {
  constructor(
    private prisma: PrismaService,
    private ruleEngine: RuleEngineService,
    private triggerService: TriggerService,
    private webhookService: CommonWebhookService, // 新增
  ) {}
}
```

**Step 2: 实现消息发送动作**

替换原有的executeMessage方法：

```typescript
/**
 * 执行消息动作
 */
private async executeMessage(
  config: any,
  entityType: string,
  entityId: string,
) {
  const { templateCode, variables, priority = 'normal' } = config;

  // 使用Webhook服务发送消息
  await this.webhookService.sendTemplate(templateCode, variables, priority);

  return {
    message: 'Message sent via webhook',
    templateCode,
    variables,
  };
}
```

**Step 3: 测试集成**

创建测试规则，触发消息动作，查看Webhook是否正确发送。

**Step 4: 提交变更**

```bash
git add src/modules/rule-engine/services/workflow-executor.service.ts
git commit -m "feat: 集成Webhook到自动化规则引擎

- 使用CommonWebhookService发送消息
- 支持模板和变量替换
- 支持优先级队列

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: 集成到产品流程执行

**Files:**
- Modify: `backend/src/modules/scheduler/scheduler.service.ts`

**Step 1: 注入Webhook服务**

```typescript
// backend/src/modules/scheduler/scheduler.service.ts
import { CommonWebhookService } from '@/common/services/webhook.service';

@Injectable()
export class SchedulerService {
  constructor(
    private prisma: PrismaService,
    private webhookService: CommonWebhookService, // 新增
  ) {}
}
```

**Step 2: 修改executeNotifyNode方法**

```typescript
/**
 * 执行通知节点
 */
private async executeNotifyNode(
  node: any,
  contractId: string,
  customerId: string,
) {
  let notifyConfig;

  try {
    notifyConfig = JSON.parse(node.notifyConfig || '{}');
  } catch {
    notifyConfig = {};
  }

  // 获取客户和合同信息
  const customer = await this.prisma.customer.findUnique({
    where: { id: customerId },
  });
  const contract = contractId
    ? await this.prisma.contract.findUnique({
        where: { id: contractId },
      })
    : null;

  // 创建系统内通知
  await this.prisma.notification.create({
    data: {
      userId: customer.followUserId || customerId,
      type: 'SERVICE',
      title: notifyConfig.title || `服务通知：${node.name}`,
      content: notifyConfig.content || `您的服务节点【${node.name}】已触发`,
      link: notifyConfig.link,
    },
  });

  // 如果启用了Webhook通知
  if (notifyConfig.webhookEnabled) {
    // 发送Webhook通知
    await this.webhookService.sendTemplate(
      notifyConfig.templateCode || 'TASK_ASSIGNED',
      {
        customerName: customer.name,
        contractNo: contract?.contractNo,
        amount: contract?.amount,
        url: notifyConfig.link,
      },
      notifyConfig.priority || 'normal',
    );
  }
}
```

**Step 3: 测试集成**

触发一个产品流程通知节点，验证Webhook是否正确发送。

**Step 4: 提交变更**

```bash
git add src/modules/scheduler/scheduler.service.ts
git commit -m "feat: 集成Webhook到产品流程执行

- 通知节点支持Webhook推送
- 使用模板变量替换
- 支持优先级配置

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: 集成到支付模块

**Files:**
- Modify: `backend/src/modules/payment-order/payment-order.module.ts`
- Create: `backend/src/modules/payment-order/payment-webhook.service.ts`

**Step 1: 创建支付Webhook服务**

```typescript
// backend/src/modules/payment-order/payment-webhook.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { CommonWebhookService } from '@/common/services/webhook.service';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class PaymentWebhookService {
  private readonly logger = new Logger(PaymentWebhookService.name);

  constructor(
    private webhookService: CommonWebhookService,
    private prisma: PrismaService,
  ) {}

  /**
   * 支付成功通知
   */
  async notifyPaymentSuccess(orderNo: string, amount: number) {
    // 获取订单信息
    const order = await this.prisma.paymentOrder.findUnique({
      where: { orderNo },
      include: {
        contract: {
          include: {
            customer: true,
          },
        },
      },
    });

    if (!order) {
      this.logger.warn(`Order not found: ${orderNo}`);
      return;
    }

    const { customer } = order.contract;

    // 发送Webhook通知
    await this.webhookService.sendTemplate('PAYMENT_SUCCESS', {
      customerName: customer.name,
      contractNo: order.contract.contractNo,
      amount: amount,
      date: new Date().toISOString().split('T')[0],
    });
  }

  /**
   * 支付失败通知
   */
  async notifyPaymentFailed(orderNo: string, error: string) {
    await this.webhookService.sendTemplate('TASK_ASSIGNED', {
      customerName: orderNo,
      amount: 0,
      date: new Date().toISOString().split('T')[0],
    });
  }
}
```

**Step 2: 在支付回调中调用通知**

修改 `payment-order.service.ts` 的 handleCallback 方法：

```typescript
// 在支付成功后添加
if (order.contractId) {
  // ... 创建收款记录

  // 发送Webhook通知
  await this.paymentWebhookService.notifyPaymentSuccess(
    result.orderNo,
    result.amount,
  );
}
```

**Step 3: 注册服务到模块**

```typescript
// backend/src/modules/payment-order/payment-order.module.ts
import { PaymentWebhookService } from './payment-webhook.service';

@Module({
  // ...
  providers: [
    // ...
    PaymentWebhookService,
  ],
})
export class PaymentOrderModule {}
```

**Step 4: 测试集成**

模拟支付成功回调，验证Webhook通知是否发送。

**Step 5: 提交变更**

```bash
git add src/modules/payment-order/
git commit -m "feat: 集成Webhook到支付模块

- 支付成功时发送通知
- 支付失败时发送告警
- 使用模板变量

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: 集成到合同到期提醒

**Files:**
- Modify: `backend/src/modules/scheduler/scheduler.service.ts`

**Step 1: 修改合同到期检查方法**

```typescript
/**
 * 创建合同到期通知
 */
private async createExpiryNotification(contract: any, config: any = {}) {
  // 通知合同负责人
  if (contract.customer.followUserId) {
    // 创建系统内通知
    await this.prisma.notification.create({
      data: {
        userId: contract.customer.followUserId,
        type: 'CONTRACT_EXPIRE',
        title: '合同到期提醒',
        content: `合同【${contract.contractNo}】将于 ${contract.serviceEnd} 到期，请及时处理`,
        link: `/contracts/${contract.id}`,
      },
    });

    // 发送Webhook通知
    await this.webhookService.sendTemplate('CONTRACT_EXPIRE', {
      customerName: contract.customer.name,
      contractNo: contract.contractNo,
      amount: contract.amount,
      date: contract.serviceEnd.toISOString().split('T')[0],
      url: `/contracts/${contract.id}`,
    });
  }
}
```

**Step 2: 测试集成**

等待定时任务触发或手动触发到期检查。

**Step 3: 提交变更**

```bash
git add src/modules/scheduler/scheduler.service.ts
git commit -m "feat: 合同到期提醒集成Webhook

- 到期检查时发送Webhook通知
- 包含合同详细信息和链接

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: 创建Webhook管理接口（可选）

**Files:**
- Create: `backend/src/modules/webhooks/webhook-manage.controller.ts`

**Step 1: 创建管理控制器**

```typescript
// backend/src/modules/webhooks/webhook-manage.controller.ts
import { Controller, Get, Post, Body, Param, Patch } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { SendWebhookDto } from './dto/send-webhook.dto';

@ApiTags('webhooks')
@Controller('webhooks/manage')
export class WebhookManageController {
  constructor(private webhooksService: WebhooksService) {}

  @Post('test/:id')
  @ApiOperation({ summary: '测试Webhook发送' })
  async testSend(@Param('id') id: string, @Body() dto: SendWebhookDto) {
    return this.webhooksService.sendMessage({
      configId: id,
      ...dto,
    });
  }

  @Get('logs/:configId')
  @ApiOperation({ summary: '查询Webhook发送日志' })
  async getLogs(@Param('configId') configId: string) {
    return this.webhooksService.getSendLogs(configId);
  }

  @Post('retry/:messageId')
  @ApiOperation({ summary: '重新发送失败的消息' })
  async retry(@Param('messageId') messageId: string) {
    return this.webhooksService.retryMessage(messageId);
  }
}
```

**Step 2: 在WebhooksModule中注册**

```typescript
// backend/src/modules/webhooks/webhooks.module.ts
import { WebhookManageController } from './webhook-manage.controller';

@Module({
  controllers: [WebhookManageController, /* ... */],
})
export class WebhooksModule {}
```

**Step 3: 测试管理接口**

```bash
# 测试发送
curl -X POST http://localhost:7890/api/webhooks/manage/test/{configId} \
  -H "Content-Type: application/json" \
  -d '{"messageType":"text","content":{"content":"测试消息"}}'

# 查询日志
curl http://localhost:7890/api/webhooks/manage/logs/{configId}

# 重新发送
curl -X POST http://localhost:7890/api/webhooks/manage/retry/{messageId}
```

**Step 4: 提交变更**

```bash
git add src/modules/webhooks/
git commit -m "feat: 添加Webhook管理接口

- 测试发送接口
- 查询发送日志
- 失败消息重发

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 验收标准

- ✅ 全局Webhook服务正常工作
- ✅ 支持企业微信、钉钉、飞书
- ✅ 消息模板和变量替换功能正常
- ✅ 异步队列处理消息
- ✅ 失败自动重试机制有效
- ✅ 集成到自动化规则引擎
- ✅ 集成到产品流程执行
- ✅ 集成到支付模块
- ✅ 集成到合同到期提醒
- ✅ 管理接口可用（可选）

---

**下一步**: 自动化规则引擎完善实施计划
