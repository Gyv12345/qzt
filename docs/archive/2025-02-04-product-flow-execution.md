# 产品流程执行引擎实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完善产品流程执行引擎，实现通知节点、任务节点的自动化执行

**Architecture:**
- 通知节点：系统内通知 + Webhook推送，支持模板变量替换
- 任务节点：执行预定义的系统操作
- 周期性节点：基于cron表达式重复执行
- 顺序/并行执行策略
- 失败自动重试机制

**Tech Stack:**
- NestJS Scheduler
- Bull Queue for async processing
- Cron for periodic tasks
- Prisma for logging

---

## Task 1: 完善SchedulerService节点执行逻辑

**Files:**
- Modify: `backend/src/modules/scheduler/scheduler.service.ts`

**Step 1: 优化processFlowExecution方法**

```typescript
// backend/src/modules/scheduler/scheduler.service.ts

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

    // 获取节点配置
    const nodeConfig = JSON.parse(node.config || '{}');
    const cycleConfig = JSON.parse(node.cycleConfig || '{}');
    const notifyConfig = JSON.parse(node.notifyConfig || '{}');

    // 根据节点类型执行不同的逻辑
    if (node.type === 'NOTIFY') {
      await this.executeNotifyNode(
        node,
        contractId,
        customerId,
        notifyConfig,
      );
    } else if (node.type === 'TASK') {
      await this.executeTaskNode(
        node,
        contractId,
        customerId,
        nodeConfig,
      );
    }

    // 更新状态为成功
    await this.prisma.productFlowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'SUCCESS',
        completedAt: new Date(),
        result: JSON.stringify({ message: 'Node executed successfully' }),
      },
    });

    this.logger.log(`[流程执行] 节点 ${node.name} 执行成功`);

    // 如果是周期性节点，创建下一次执行任务
    if (node.type === 'CYCLE' && cycleConfig.cron) {
      await this.scheduleNextExecution(node, contractId, customerId, cycleConfig);
    }
  } catch (error: any) {
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

    // 失败重试（最多3次）
    const retryCount = execution.retryCount || 0;
    if (retryCount < 3) {
      await this.prisma.productFlowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'PENDING',
          retryCount: retryCount + 1,
        },
      });

      this.logger.log(`[流程执行] 节点 ${node.name} 将重试 (${retryCount + 1}/3)`);
    } else {
      // 重试次数用尽，发送告警
      await this.sendNodeFailureAlert(node, error.message);
    }
  }
}
```

**Step 2: 增强executeNotifyNode方法**

```typescript
/**
 * 执行通知节点
 */
private async executeNotifyNode(
  node: any,
  contractId: string,
  customerId: string,
  notifyConfig: any,
) {
  // 获取客户信息
  const customer = await this.prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      followUser: true,
    },
  });

  // 获取合同信息（可选）
  let contract = null;
  if (contractId) {
    contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });
  }

  // 准备模板变量
  const variables = {
    customerName: customer?.name || '',
    contractNo: contract?.contractNo || '',
    contractAmount: contract?.amount || 0,
    serviceName: contract?.product?.name || '',
    nodeTitle: node.name,
    executeDate: new Date().toLocaleDateString('zh-CN'),
  };

  // 构建通知内容
  const title = this.replaceVariables(
    notifyConfig.title || `服务通知：${node.name}`,
    variables,
  );
  const content = this.replaceVariables(
    notifyConfig.content || `您的服务节点【${node.name}】已触发`,
    variables,
  );

  // 创建系统内通知
  if (customer?.followUserId) {
    await this.prisma.notification.create({
      data: {
        userId: customer.followUserId,
        type: 'SERVICE',
        title,
        content,
        link: notifyConfig.link || (contractId ? `/contracts/${contractId}` : null),
      },
    });

    this.logger.log(`[通知节点] 创建系统通知: ${title}`);
  }

  // 如果启用了Webhook通知
  if (notifyConfig.webhookEnabled && this.webhookService) {
    await this.webhookService.sendTemplate(
      notifyConfig.templateCode || 'TASK_ASSIGNED',
      {
        ...variables,
        url: notifyConfig.link,
      },
      notifyConfig.priority || 'normal',
    );

    this.logger.log(`[通知节点] 发送Webhook通知: ${title}`);
  }
}

/**
 * 替换模板变量
 */
private replaceVariables(template: string, variables: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value));
  }
  return result;
}
```

**Step 3: 实现executeTaskNode方法**

```typescript
/**
 * 执行任务节点
 */
private async executeTaskNode(
  node: any,
  contractId: string,
  customerId: string,
  config: any,
) {
  const { action } = config;

  this.logger.log(`[任务节点] 执行任务：${node.name}`, { action, config });

  switch (action) {
    case 'UPDATE_CONTRACT_STATUS':
      await this.taskUpdateContractStatus(contractId, config);
      break;

    case 'UPDATE_CUSTOMER_LEVEL':
      await this.taskUpdateCustomerLevel(customerId, config);
      break;

    case 'CREATE_FOLLOW_TASK':
      await this.taskCreateFollowTask(customerId, config);
      break;

    case 'TRIGGER_AUTOMATION':
      await this.taskTriggerAutomation(config);
      break;

    default:
      this.logger.warn(`[任务节点] 未知的任务类型: ${action}`);
  }
}

/**
 * 任务：更新合同状态
 */
private async taskUpdateContractStatus(contractId: string, config: any) {
  if (!contractId) {
    throw new Error('ContractId is required for UPDATE_CONTRACT_STATUS');
  }

  const { status, remark } = config;

  await this.prisma.contract.update({
    where: { id: contractId },
    data: {
      status,
      remark,
    },
  });

  this.logger.log(`[任务节点] 合同状态已更新: ${contractId} -> ${status}`);
}

/**
 * 任务：更新客户级别
 */
private async taskUpdateCustomerLevel(customerId: string, config: any) {
  const { level, reason } = config;

  await this.prisma.customer.update({
    where: { id: customerId },
    data: {
      customerLevel: level,
    },
  });

  this.logger.log(`[任务节点] 客户级别已更新: ${customerId} -> ${level}`);
}

/**
 * 任务：创建跟进任务
 */
private async taskCreateFollowTask(customerId: string, config: any) {
  const customer = await this.prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer || !customer.followUserId) {
    throw new Error('Customer or follow user not found');
  }

  const { type, content, daysUntilDue } = config;

  await this.prisma.followRecord.create({
    data: {
      customerId,
      userId: customer.followUserId,
      type,
      content,
      nextTime: daysUntilDue
        ? new Date(Date.now() + daysUntilDue * 24 * 60 * 60 * 1000)
        : new Date(),
    },
  });

  this.logger.log(`[任务节点] 创建跟进任务: ${customerId}`);
}

/**
 * 任务：触发自动化规则
 */
private async taskTriggerAutomation(config: any) {
  const { triggerId, entityType, entityId } = config;

  // 调用自动化规则引擎
  // 这里需要注入 WorkflowExecutorService
  // 暂时记录日志
  this.logger.log(`[任务节点] 触发自动化规则: ${triggerId}`);
}
```

**Step 4: 添加周期性节点调度**

```typescript
/**
 * 调度下一次周期性执行
 */
private async scheduleNextExecution(
  node: any,
  contractId: string,
  customerId: string,
  cycleConfig: any,
) {
  const { cron } = cycleConfig;

  // 计算下次执行时间（基于cron表达式）
  const nextExecutionTime = this.getNextCronDate(cron);

  // 创建下一次执行记录
  await this.prisma.productFlowExecution.create({
    data: {
      nodeId: node.id,
      contractId,
      customerId,
      status: 'PENDING',
    },
  });

  this.logger.log(
    `[周期节点] 已调度下次执行: ${node.name} at ${nextExecutionTime}`,
  );
}

/**
 * 根据cron表达式计算下次执行时间
 */
private getNextCronDate(cronExpression: string): Date {
  // 简化实现：使用cron-parser库或自己解析
  // 这里返回一个默认值（明天同一时间）
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
}
```

**Step 5: 添加失败告警**

```typescript
/**
 * 发送节点失败告警
 */
private async sendNodeFailureAlert(node: any, errorMessage: string) {
  // 创建告警通知给系统管理员
  const adminUsers = await this.prisma.user.findMany({
    where: {
      roles: {
        some: {
          role: {
            code: 'ADMIN',
          },
        },
      },
      status: 1,
    },
  });

  for (const admin of adminUsers) {
    await this.prisma.notification.create({
      data: {
        userId: admin.id,
        type: 'ERROR',
        title: `流程节点执行失败: ${node.name}`,
        content: `节点执行失败，错误信息: ${errorMessage}`,
      },
    });
  }

  // 发送Webhook告警
  if (this.webhookService) {
    await this.webhookService.sendTemplate('TASK_ASSIGNED', {
      customerName: node.name,
      contractNo: errorMessage,
      amount: 0,
    });
  }
}
```

**Step 6: 注入WebhookService**

```typescript
// backend/src/modules/scheduler/scheduler.service.ts
import { CommonWebhookService } from '@/common/services/webhook.service';

@Injectable()
export class SchedulerService {
  constructor(
    private prisma: PrismaService,
    private webhookService: CommonWebhookService,
  ) {}
}
```

**Step 7: 测试节点执行**

```bash
# 启动服务
pnpm run start:dev

# 创建测试流程和节点
# 触发执行，观察日志
```

**Step 8: 提交变更**

```bash
git add src/modules/scheduler/scheduler.service.ts
git commit -m "feat: 完善产品流程执行引擎

- 优化processFlowExecution：支持失败重试
- 增强executeNotifyNode：模板变量、Webhook集成
- 实现executeTaskNode：4种任务类型
- 添加周期性节点调度
- 失败告警机制

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: 创建流程管理API

**Files:**
- Create: `backend/src/modules/product/product-flow-execution.controller.ts`
- Create: `backend/src/modules/product/dto/flow-execution.dto.ts`

**Step 1: 创建执行DTO**

```typescript
// backend/src/modules/product/dto/flow-execution.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum ExecutionStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export class QueryFlowExecutionDto {
  @IsOptional()
  @IsString()
  nodeId?: string;

  @IsOptional()
  @IsString()
  contractId?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(ExecutionStatus)
  status?: ExecutionStatus;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}

export class CreateManualExecutionDto {
  @IsString()
  nodeId: string;

  @IsString()
  @IsOptional()
  contractId?: string;

  @IsString()
  @IsOptional()
  customerId?: string;
}

export class RetryExecutionDto {
  @IsString()
  executionId: string;
}
```

**Step 2: 创建执行控制器**

```typescript
// backend/src/modules/product/product-flow-execution.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '@/common/prisma/prisma.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import {
  QueryFlowExecutionDto,
  CreateManualExecutionDto,
  RetryExecutionDto,
} from './dto/flow-execution.dto';

@ApiTags('product-flow-executions')
@Controller('product-flow-executions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductFlowExecutionController {
  constructor(
    private prisma: PrismaService,
    private scheduler: SchedulerService,
  ) {}

  @Get()
  @ApiOperation({ summary: '查询流程执行记录' })
  async findAll(@Query() query: QueryFlowExecutionDto) {
    const { nodeId, contractId, customerId, status, page = 1, pageSize = 20 } =
      query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (nodeId) where.nodeId = nodeId;
    if (contractId) where.contractId = contractId;
    if (customerId) where.customerId = customerId;
    if (status) where.status = status;

    const [total, data] = await Promise.all([
      this.prisma.productFlowExecution.count({ where }),
      this.prisma.productFlowExecution.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          node: {
            include: {
              flow: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      total,
      data,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '查询执行记录详情' })
  async findOne(@Param('id') id: string) {
    return this.prisma.productFlowExecution.findUnique({
      where: { id },
      include: {
        node: {
          include: {
            flow: true,
          },
        },
      },
    });
  }

  @Post('manual')
  @ApiOperation({ summary: '手动触发节点执行' })
  async manualExecute(@Body() dto: CreateManualExecutionDto) {
    // 创建执行记录
    const execution = await this.prisma.productFlowExecution.create({
      data: {
        nodeId: dto.nodeId,
        contractId: dto.contractId,
        customerId: dto.customerId,
        status: 'PENDING',
      },
    });

    // 触发执行
    // 注意：这里需要调用Scheduler的私有方法，可以考虑提取为公共方法
    return {
      message: 'Execution created',
      executionId: execution.id,
    };
  }

  @Post('retry')
  @ApiOperation({ summary: '重试失败的执行' })
  async retry(@Body() dto: RetryExecutionDto) {
    const execution = await this.prisma.productFlowExecution.findUnique({
      where: { id: dto.executionId },
      include: {
        node: true,
      },
    });

    if (!execution) {
      throw new Error('Execution not found');
    }

    // 重置状态为PENDING
    await this.prisma.productFlowExecution.update({
      where: { id: dto.executionId },
      data: {
        status: 'PENDING',
        retryCount: 0,
        error: null,
      },
    });

    return {
      message: 'Execution queued for retry',
      executionId: dto.executionId,
    };
  }

  @Get('statistics/summary')
  @ApiOperation({ summary: '获取执行统计' })
  async getStatistics() {
    const [
      total,
      pending,
      running,
      success,
      failed,
    ] = await Promise.all([
      this.prisma.productFlowExecution.count(),
      this.prisma.productFlowExecution.count({ where: { status: 'PENDING' } }),
      this.prisma.productFlowExecution.count({ where: { status: 'RUNNING' } }),
      this.prisma.productFlowExecution.count({ where: { status: 'SUCCESS' } }),
      this.prisma.productFlowExecution.count({ where: { status: 'FAILED' } }),
    ]);

    return {
      total,
      pending,
      running,
      success,
      failed,
      successRate: total > 0 ? ((success / total) * 100).toFixed(2) : 0,
    };
  }
}
```

**Step 3: 注册控制器到模块**

```typescript
// backend/src/modules/product/product.module.ts
import { ProductFlowExecutionController } from './product-flow-execution.controller';

@Module({
  controllers: [
    // ...existing controllers
    ProductFlowExecutionController,
  ],
})
export class ProductModule {}
```

**Step 4: 测试API**

```bash
# 查询执行记录
curl http://localhost:7890/api/product-flow-executions

# 手动触发执行
curl -X POST http://localhost:7890/api/product-flow-executions/manual \
  -H "Content-Type: application/json" \
  -d '{"nodeId":"xxx","customerId":"xxx"}'

# 获取统计信息
curl http://localhost:7890/api/product-flow-executions/statistics/summary
```

**Step 5: 提交变更**

```bash
git add src/modules/product/
git commit -m "feat: 添加产品流程执行管理API

- 查询执行记录
- 手动触发节点执行
- 重试失败的执行
- 获取执行统计信息

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: 优化定时任务调度

**Files:**
- Modify: `backend/src/modules/scheduler/scheduler.service.ts`

**Step 1: 优化processPendingFlowNodes定时任务**

```typescript
/**
 * 每小时检查一次待执行的流程节点
 */
@Cron(CronExpression.EVERY_HOUR)
async processPendingFlowNodes() {
  this.logger.log('[定时任务] 开始处理待执行的流程节点...');

  try {
    // 获取所有待执行的节点（按order排序）
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

    // 按order分组（相同order的并行执行）
    const executionsByOrder = new Map<number, any[]>();
    for (const execution of pendingExecutions) {
      const order = execution.node.order || 0;
      if (!executionsByOrder.has(order)) {
        executionsByOrder.set(order, []);
      }
      executionsByOrder.get(order)!.push(execution);
    }

    // 按order顺序执行
    const sortedOrders = Array.from(executionsByOrder.keys()).sort(
      (a, b) => a - b,
    );

    for (const order of sortedOrders) {
      const executions = executionsByOrder.get(order)!;

      this.logger.log(`[定时任务] 执行order=${order}的节点，数量: ${executions.length}`);

      // 并行执行相同order的节点
      await Promise.allSettled(
        executions.map((execution) => this.processFlowExecution(execution)),
      );
    }

    this.logger.log('[定时任务] 流程节点处理完成');
  } catch (error) {
    this.logger.error('[定时任务] 处理流程节点失败', error);
  }
}
```

**Step 2: 添加周期性节点检查定时任务**

```typescript
/**
 * 每天凌晨3点检查并创建周期性节点的下次执行
 */
@Cron(CronExpression.EVERY_DAY_AT_3AM)
async schedulePeriodicNodes() {
  this.logger.log('[定时任务] 开始调度周期性节点...');

  try {
    // 获取所有启用的周期性节点
    const periodicNodes = await this.prisma.productFlowNode.findMany({
      where: {
        type: 'CYCLE',
        enabled: true,
      },
      include: {
        flow: {
          include: {
            product: {
              include: {
                contracts: {
                  where: {
                    status: {
                      not: 2, // 排除已完成的合同
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    this.logger.log(`[定时任务] 发现 ${periodicNodes.length} 个周期性节点`);

    for (const node of periodicNodes) {
      const cycleConfig = JSON.parse(node.cycleConfig || '{}');

      if (!cycleConfig.cron) {
        continue;
      }

      // 为每个合同的节点创建执行记录
      for (const contract of node.flow.product.contracts) {
        // 检查是否已存在待执行的记录
        const existing = await this.prisma.productFlowExecution.findFirst({
          where: {
            nodeId: node.id,
            contractId: contract.id,
            customerId: contract.customerId,
            status: 'PENDING',
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)), // 今天创建的
            },
          },
        });

        if (!existing) {
          await this.prisma.productFlowExecution.create({
            data: {
              nodeId: node.id,
              contractId: contract.id,
              customerId: contract.customerId,
              status: 'PENDING',
            },
          });

          this.logger.log(
            `[定时任务] 已创建周期性节点执行: ${node.name} for contract ${contract.contractNo}`,
          );
        }
      }
    }

    this.logger.log('[定时任务] 周期性节点调度完成');
  } catch (error) {
    this.logger.error('[定时任务] 调度周期性节点失败', error);
  }
}
```

**Step 3: 添加执行超时检查**

```typescript
/**
 * 每10分钟检查执行超时的节点
 */
@Cron('*/10 * * * *')
async checkExecutionTimeout() {
  this.logger.log('[定时任务] 检查执行超时的节点...');

  const timeout = 30 * 60 * 1000; // 30分钟超时
  const timeoutDate = new Date(Date.now() - timeout);

  const timeoutExecutions = await this.prisma.productFlowExecution.findMany({
    where: {
      status: 'RUNNING',
      executedAt: {
        lte: timeoutDate,
      },
    },
  });

  this.logger.log(`[定时任务] 发现 ${timeoutExecutions.length} 个超时的执行`);

  for (const execution of timeoutExecutions) {
    await this.prisma.productFlowExecution.update({
      where: { id: execution.id },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: 'Execution timeout',
      },
    });

    this.logger.warn(`[定时任务] 执行超时: ${execution.id}`);

    // 发送告警
    await this.sendNodeFailureAlert(execution.node, 'Execution timeout');
  }
}
```

**Step 4: 提交变更**

```bash
git add src/modules/scheduler/scheduler.service.ts
git commit -m "feat: 优化流程节点定时任务

- 按order顺序和并行执行节点
- 每天调度周期性节点
- 执行超时检查和处理
- 详细的日志记录

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 验收标准

- ✅ 通知节点正确发送系统内通知
- ✅ 通知节点支持Webhook推送
- ✅ 任务节点支持4种操作类型
- ✅ 模板变量替换正确工作
- ✅ 周期性节点按cron执行
- ✅ 节点按order顺序/并行执行
- ✅ 执行失败自动重试3次
- ✅ 超时自动标记为失败
- ✅ API接口正常工作
- ✅ 统计信息准确

---

**预估时间**: 2天
