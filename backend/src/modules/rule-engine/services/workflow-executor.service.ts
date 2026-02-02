import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RuleEngineService } from './rule-engine.service';
import { TriggerService } from './trigger.service';

@Injectable()
export class WorkflowExecutorService {
  constructor(
    private prisma: PrismaService,
    private ruleEngine: RuleEngineService,
    private triggerService: TriggerService,
  ) {}

  /**
   * 执行工作流
   */
  async executeWorkflow(
    triggerId: string,
    entityType: string,
    entityId: string,
    entityData: any
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

      // 评估条件
      const conditionsMet = await this.ruleEngine.evaluateConditions(
        trigger.conditions,
        entityData,
        entityType,
        entityId
      );

      if (!conditionsMet) {
        // 创建日志记录
        const log = await this.prisma.log.create({
          data: {
            triggerId,
            entityType,
            entityId,
            status: 'FAILED',
            duration: Date.now() - startTime,
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
        const result = await this.executeAction(
          workflow,
          entityType,
          entityId,
          entityData
        );

        logDetails.push({
          workflowId: workflow.id,
          actionType: workflow.actionType,
          config: workflow.config,
          status: 'SUCCESS',
          result: JSON.stringify(result),
        });
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
      };
    } catch (error) {
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

  /**
   * 执行单个动作
   */
  private async executeAction(
    workflow: any,
    entityType: string,
    entityId: string,
    entityData: any
  ): Promise<any> {
    const { actionType, config } = workflow;
    const configObj = JSON.parse(config);

    switch (actionType) {
      case 'RECORD_ADD':
        return await this.executeRecordAdd(configObj, entityType, entityId);
      case 'RECORD_UPDATE':
        return await this.executeRecordUpdate(configObj, entityType, entityId);
      case 'MESSAGE':
        return await this.executeMessage(configObj, entityType, entityId);
      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * 执行添加记录动作
   */
  private async executeRecordAdd(config: any, entityType: string, entityId: string) {
    const { model, data } = config;

    // 简化实现:只支持 FollowRecord
    if (model === 'FollowRecord') {
      return await this.prisma.followRecord.create({
        data: {
          customerId: entityId,
          userId: data.userId,
          type: data.type,
          content: data.content,
          nextTime: data.nextTime ? new Date(data.nextTime) : null,
        },
      });
    }

    throw new Error(`Unsupported model: ${model}`);
  }

  /**
   * 执行更新记录动作
   */
  private async executeRecordUpdate(config: any, entityType: string, entityId: string) {
    const { model, updateData } = config;

    if (model === 'Customer') {
      return await this.prisma.customer.update({
        where: { id: entityId },
        data: updateData,
      });
    }

    throw new Error(`Unsupported model: ${model}`);
  }

  /**
   * 执行消息动作(暂时只记录日志)
   */
  private async executeMessage(config: any, entityType: string, entityId: string) {
    // TODO: 集成消息发送服务
    return {
      message: 'Message action executed',
      config,
    };
  }
}
