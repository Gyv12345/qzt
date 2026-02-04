# 自动化规则引擎完善实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 完善自动化规则引擎的条件树评估（支持AND/OR嵌套）和工作流执行功能

**Architecture:**
- 重构条件树数据结构，支持嵌套的AND/OR逻辑
- 使用递归算法评估条件树
- 扩展工作流动作类型（集成Webhook）
- 优化执行日志和重试机制

**Tech Stack:**
- NestJS Services
- Prisma for data persistence
- Bull Queue for async processing

---

## Task 1: 完善条件树数据结构

**Files:**
- Modify: `backend/src/modules/rule-engine/services/rule-engine.service.ts`
- Create: `backend/src/modules/rule-engine/dto/condition-tree.dto.ts`

**Step 1: 创建条件树DTO**

```typescript
// backend/src/modules/rule-engine/dto/condition-tree.dto.ts
import { IsString, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export enum ConditionOperator {
  EQUALS = '=',
  NOT_EQUALS = '!=',
  GREATER_THAN = '>',
  LESS_THAN = '<',
  GREATER_EQUAL = '>=',
  LESS_EQUAL = '<=',
  IN = 'IN',
  LIKE = 'LIKE',
  BETWEEN = 'BETWEEN',
}

export enum ConditionLogic {
  AND = 'AND',
  OR = 'OR',
}

export class ConditionLeaf {
  @IsString()
  field: string;

  @IsEnum(ConditionOperator)
  operator: ConditionOperator;

  @IsString()
  value: string;

  logic?: ConditionLogic;
}

export class ConditionGroup {
  @IsEnum(ConditionLogic)
  logic: ConditionLogic;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object, {
    discriminator: {
      property: 'type',
      subTypes: [
        { value: 'leaf', class: ConditionLeaf },
        { value: 'group', class: ConditionGroup },
      ],
    },
  })
  conditions: Array<ConditionLeaf | ConditionGroup>;
}

export type ConditionTree = ConditionLeaf | ConditionGroup;
```

**Step 2: 重构RuleEngineService**

```typescript
// backend/src/modules/rule-engine/services/rule-engine.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { ConditionTree, ConditionLogic, ConditionLeaf, ConditionGroup } from '../dto/condition-tree.dto';

@Injectable()
export class RuleEngineService {
  constructor(private prisma: PrismaService) {}

  /**
   * 评估条件树（支持嵌套）
   */
  async evaluateCondition(
    condition: ConditionTree,
    data: any,
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    // 判断是叶子节点还是条件组
    if (this.isConditionGroup(condition)) {
      return this.evaluateConditionGroup(condition, data, entityType, entityId);
    } else {
      return this.evaluateConditionLeaf(condition, data);
    }
  }

  /**
   * 评估条件组
   */
  private async evaluateConditionGroup(
    group: ConditionGroup,
    data: any,
    entityType: string,
    entityId: string,
  ): Promise<boolean> {
    const { logic, conditions } = group;

    if (logic === ConditionLogic.AND) {
      // AND逻辑：所有条件都必须满足
      for (const condition of conditions) {
        const result = await this.evaluateCondition(
          condition,
          data,
          entityType,
          entityId,
        );
        if (!result) {
          return false; // 任一不满足则返回false
        }
      }
      return true; // 全部满足
    } else {
      // OR逻辑：任一条件满足即可
      for (const condition of conditions) {
        const result = await this.evaluateCondition(
          condition,
          data,
          entityType,
          entityId,
        );
        if (result) {
          return true; // 任一满足则返回true
        }
      }
      return false; // 全部不满足
    }
  }

  /**
   * 评估叶子节点（单个条件）
   */
  private async evaluateConditionLeaf(
    leaf: ConditionLeaf,
    data: any,
  ): Promise<boolean> {
    const { field, operator, value } = leaf;

    // 获取字段值
    const fieldValue = this.getFieldValue(data, field);

    // 解析期望值
    const expectedValue = this.parseValue(value);

    // 执行比较
    return this.compare(fieldValue, operator, expectedValue);
  }

  /**
   * 判断是否为条件组
   */
  private isConditionGroup(obj: any): obj is ConditionGroup {
    return obj && obj.conditions && Array.isArray(obj.conditions);
  }

  /**
   * 从数据对象中获取字段值（支持嵌套）
   */
  private getFieldValue(data: any, field: string): any {
    if (!field) return null;

    const keys = field.split('.');
    let value = data;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return null;
      }
    }

    return value;
  }

  /**
   * 解析值（JSON字符串或直接返回）
   */
  private parseValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  /**
   * 比较两个值
   */
  private compare(
    fieldValue: any,
    operator: string,
    expectedValue: any,
  ): boolean {
    switch (operator) {
      case '=':
      case '==':
        return fieldValue == expectedValue;
      case '!=':
      case '<>':
        return fieldValue != expectedValue;
      case '>':
        return Number(fieldValue) > Number(expectedValue);
      case '<':
        return Number(fieldValue) < Number(expectedValue);
      case '>=':
        return Number(fieldValue) >= Number(expectedValue);
      case '<=':
        return Number(fieldValue) <= Number(expectedValue);
      case 'IN':
        return Array.isArray(expectedValue) && expectedValue.includes(fieldValue);
      case 'LIKE':
        return (
          typeof fieldValue === 'string' &&
          fieldValue
            .toLowerCase()
            .includes(String(expectedValue).toLowerCase())
        );
      case 'BETWEEN':
        if (!Array.isArray(expectedValue) || expectedValue.length !== 2) {
          return false;
        }
        const numValue = Number(fieldValue);
        return (
          numValue >= Number(expectedValue[0]) &&
          numValue <= Number(expectedValue[1])
        );
      default:
        return false;
    }
  }
}
```

**Step 3: 更新数据库Schema（如果需要）**

确保 `Condition` 模型支持嵌套结构：

```prisma
// backend/prisma/schema.prisma
model Condition {
  id        String   @id @default(cuid())
  triggerId String
  field     String
  operator  String
  value     String
  logic     String   @default("AND")
  parentId  String?  // 父条件ID
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  trigger   Trigger  @relation(fields: [triggerId], references: [id], onDelete: Cascade)
  parent    Condition? @relation("ConditionHierarchy", fields: [parentId], references: [id])
  children  Condition[] @relation("ConditionHierarchy")

  @@index([triggerId])
  @@index([parentId])
  @@map("conditions")
}
```

**Step 4: 运行数据库迁移**

```bash
npx prisma migrate dev --name add_condition_parent_id
```

**Step 5: 测试条件树评估**

创建单元测试验证嵌套条件：

```typescript
// 测试数据
const conditionGroup = {
  logic: 'AND',
  conditions: [
    {
      field: 'customer.level',
      operator: '=',
      value: 'VIP',
    },
    {
      logic: 'OR',
      conditions: [
        {
          field: 'contract.amount',
          operator: '>',
          value: '10000',
        },
        {
          field: 'customer.followYears',
          operator: '>=',
          value: '3',
        },
      ],
    },
  ],
};

const data = {
  customer: {
    level: 'VIP',
    followYears: 2,
  },
  contract: {
    amount: 15000,
  },
};

// 应该返回true（VIP AND (amount > 10000 OR followYears >= 3)）
```

**Step 6: 提交变更**

```bash
git add src/modules/rule-engine/
git commit -m "feat: 完善规则引擎条件树评估

- 支持AND/OR嵌套条件
- 使用递归算法评估条件树
- 支持字段嵌套访问
- 添加条件树DTO

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: 扩展工作流动作类型

**Files:**
- Modify: `backend/src/modules/rule-engine/services/workflow-executor.service.ts`
- Create: `backend/src/modules/rule-engine/workflows/`

**Step 1: 创建工作流处理器**

```typescript
// backend/src/modules/rule-engine/workflows/record-add.workflow.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class RecordAddWorkflow {
  constructor(private prisma: PrismaService) {}

  async execute(config: any, entityType: string, entityId: string) {
    const { model, data } = config;

    switch (model) {
      case 'FollowRecord':
        return await this.prisma.followRecord.create({
          data: {
            customerId: entityId,
            userId: data.userId,
            type: data.type,
            content: data.content,
            nextTime: data.nextTime ? new Date(data.nextTime) : null,
          },
        });

      case 'Notification':
        return await this.prisma.notification.create({
          data: {
            userId: data.userId,
            type: data.type || 'SYSTEM',
            title: data.title,
            content: data.content,
            link: data.link,
          },
        });

      default:
        throw new Error(`Unsupported model for RECORD_ADD: ${model}`);
    }
  }
}
```

```typescript
// backend/src/modules/rule-engine/workflows/record-update.workflow.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';

@Injectable()
export class RecordUpdateWorkflow {
  constructor(private prisma: PrismaService) {}

  async execute(config: any, entityType: string, entityId: string) {
    const { model, updateData, condition } = config;

    switch (model) {
      case 'Customer':
        const updateWhere: any = { id: entityId };

        // 支持条件更新
        if (condition) {
          Object.assign(updateWhere, condition);
        }

        return await this.prisma.customer.update({
          where: updateWhere,
          data: updateData,
        });

      case 'Contract':
        return await this.prisma.contract.update({
          where: { id: entityId },
          data: updateData,
        });

      default:
        throw new Error(`Unsupported model for RECORD_UPDATE: ${model}`);
    }
  }
}
```

```typescript
// backend/src/modules/rule-engine/workflows/webhook.workflow.ts
import { Injectable } from '@nestjs/common';
import { CommonWebhookService } from '@/common/services/webhook.service';

@Injectable()
export class WebhookWorkflow {
  constructor(private webhookService: CommonWebhookService) {}

  async execute(config: any, entityType: string, entityId: string) {
    const { templateCode, variables, priority } = config;

    await this.webhookService.sendTemplate(templateCode, variables, priority);

    return {
      success: true,
      templateCode,
    };
  }
}
```

**Step 2: 重构WorkflowExecutorService**

```typescript
// backend/src/modules/rule-engine/services/workflow-executor.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RuleEngineService } from './rule-engine.service';
import { TriggerService } from './trigger.service';
import { RecordAddWorkflow } from '../workflows/record-add.workflow';
import { RecordUpdateWorkflow } from '../workflows/record-update.workflow';
import { WebhookWorkflow } from '../workflows/webhook.workflow';

@Injectable()
export class WorkflowExecutorService {
  constructor(
    private prisma: PrismaService,
    private ruleEngine: RuleEngineService,
    private triggerService: TriggerService,
    private recordAddWorkflow: RecordAddWorkflow,
    private recordUpdateWorkflow: RecordUpdateWorkflow,
    private webhookWorkflow: WebhookWorkflow,
  ) {}

  /**
   * 执行单个动作
   */
  private async executeAction(
    workflow: any,
    entityType: string,
    entityId: string,
    entityData: any,
  ): Promise<any> {
    const { actionType, config } = workflow;
    const configObj = JSON.parse(config);

    switch (actionType) {
      case 'RECORD_ADD':
        return await this.recordAddWorkflow.execute(
          configObj,
          entityType,
          entityId,
        );

      case 'RECORD_UPDATE':
        return await this.recordUpdateWorkflow.execute(
          configObj,
          entityType,
          entityId,
        );

      case 'WEBHOOK':
        return await this.webhookWorkflow.execute(
          configObj,
          entityType,
          entityId,
        );

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }
}
```

**Step 3: 注册工作流处理器到模块**

```typescript
// backend/src/modules/rule-engine/rule-engine.module.ts
import { RecordAddWorkflow } from './workflows/record-add.workflow';
import { RecordUpdateWorkflow } from './workflows/record-update.workflow';
import { WebhookWorkflow } from './workflows/webhook.workflow';

@Module({
  providers: [
    // ...
    RecordAddWorkflow,
    RecordUpdateWorkflow,
    WebhookWorkflow,
  ],
})
export class RuleEngineModule {}
```

**Step 4: 测试工作流执行**

创建测试规则，触发各种动作类型。

**Step 5: 提交变更**

```bash
git add src/modules/rule-engine/
git commit -m "feat: 扩展工作流动作类型

- 拆分独立的工作流处理器
- RECORD_ADD: 创建记录
- RECORD_UPDATE: 更新记录
- WEBHOOK: 发送Webhook通知
- 支持条件更新

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: 优化执行日志和重试机制

**Files:**
- Modify: `backend/src/modules/rule-engine/services/workflow-executor.service.ts`
- Modify: `backend/src/modules/rule-engine/rule-engine.controller.ts`

**Step 1: 增强日志记录**

```typescript
// backend/src/modules/rule-engine/services/workflow-executor.service.ts

@Injectable()
export class WorkflowExecutorService {
  /**
   * 执行工作流（增强版）
   */
  async executeWorkflow(
    triggerId: string,
    entityType: string,
    entityId: string,
    entityData: any,
  ): Promise<any> {
    const startTime = Date.now();
    const logDetails = [];

    try {
      // 获取触发器和工作流
      const trigger = await this.triggerService.findOne(triggerId);

      if (!trigger.enabled) {
        throw new Error('Trigger is disabled');
      }

      // 获取启用的工作流
      const workflows = trigger.workflows.filter((w) => w.enabled);

      // 记录条件评估
      const conditionsResult = await this.ruleEngine.evaluateConditions(
        trigger.conditions,
        entityData,
        entityType,
        entityId,
      );

      // 记录条件评估日志
      await this.prisma.logDetail.create({
        data: {
          logId: 'temp-log-id', // 稍后更新
          workflowId: 'condition-evaluation',
          actionType: 'EVALUATE_CONDITIONS',
          config: JSON.stringify({
            conditions: trigger.conditions,
            data: entityData,
          }),
          status: conditionsResult ? 'SUCCESS' : 'FAILED',
          result: JSON.stringify({ conditionsMet: conditionsResult }),
        },
      });

      if (!conditionsResult) {
        // 创建失败日志
        const log = await this.prisma.log.create({
          data: {
            triggerId,
            entityType,
            entityId,
            status: 'FAILED',
            duration: Date.now() - startTime,
            error: 'Conditions not met',
          },
        });

        return {
          success: false,
          reason: 'Conditions not met',
          log,
        };
      }

      // 执行每个工作流
      for (const workflow of workflows) {
        const workflowStartTime = Date.now();

        try {
          const result = await this.executeAction(
            workflow,
            entityType,
            entityId,
            entityData,
          );

          const workflowDuration = Date.now() - workflowStartTime;

          logDetails.push({
            workflowId: workflow.id,
            actionType: workflow.actionType,
            config: workflow.config,
            status: 'SUCCESS',
            result: JSON.stringify(result),
            duration: workflowDuration,
          });
        } catch (error: any) {
          const workflowDuration = Date.now() - workflowStartTime;

          logDetails.push({
            workflowId: workflow.id,
            actionType: workflow.actionType,
            config: workflow.config,
            status: 'FAILED',
            error: error.message,
            duration: workflowDuration,
          });

          // 继续执行其他工作流，不中断
        }
      }

      // 创建执行日志
      const log = await this.prisma.log.create({
        data: {
          triggerId,
          entityType,
          entityId,
          status: 'SUCCESS',
          duration: Date.now() - startTime,
        },
      });

      // 保存日志详情
      if (logDetails.length > 0) {
        await this.prisma.logDetail.createMany({
          data: logDetails.map((detail) => ({
            ...detail,
            logId: log.id,
          })),
        });
      }

      return {
        success: true,
        log,
        executedWorkflows: workflows.length,
        successfulWorkflows: logDetails.filter((d) => d.status === 'SUCCESS').length,
        failedWorkflows: logDetails.filter((d) => d.status === 'FAILED').length,
      };
    } catch (error: any) {
      // 记录错误日志
      const log = await this.prisma.log.create({
        data: {
          triggerId,
          entityType,
          entityId,
          status: 'FAILED',
          duration: Date.now() - startTime,
          error: error.message,
        },
      });

      return {
        success: false,
        error: error.message,
        log,
      };
    }
  }
}
```

**Step 2: 添加手动重试接口**

```typescript
// backend/src/modules/rule-engine/rule-engine.controller.ts

@Controller('rule-engine')
export class RuleEngineController {
  @Post('logs/:logId/retry')
  @ApiOperation({ summary: '重试失败的规则执行' })
  async retryLog(@Param('logId') logId: string) {
    const log = await this.prisma.log.findUnique({
      where: { id: logId },
      include: {
        trigger: true,
      },
    });

    if (!log) {
      throw new NotFoundException('Log not found');
    }

    if (log.status === 'SUCCESS') {
      throw new BadRequestException('Log already succeeded');
    }

    // 获取实体数据
    let entityData;
    if (log.entityType === 'Customer') {
      entityData = await this.prisma.customer.findUnique({
        where: { id: log.entityId },
      });
    }

    // 重新执行
    return await this.workflowExecutor.executeWorkflow(
      log.triggerId,
      log.entityType,
      log.entityId,
      entityData,
    );
  }
}
```

**Step 3: 测试重试机制**

1. 触发一个规则让它失败
2. 调用重试接口
3. 验证是否重新执行

**Step 4: 提交变更**

```bash
git add src/modules/rule-engine/
git commit -m "feat: 优化规则引擎执行日志和重试

- 详细记录条件评估过程
- 记录每个工作流的执行结果和耗时
- 支持手动重试失败的执行
- 部分失败不影响其他工作流

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 验收标准

- ✅ 条件树支持AND/OR嵌套
- ✅ 条件评估结果准确
- ✅ 工作流支持RECORD_ADD、RECORD_UPDATE、WEBHOOK动作
- ✅ 执行日志详细记录过程
- ✅ 失败自动重试或手动重试
- ✅ 部分失败不影响其他工作流

---

**预估时间**: 2-3天
