import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TriggerService } from './services/trigger.service';
import { WorkflowExecutorService } from './services/workflow-executor.service';
import { RuleEngineService } from './services/rule-engine.service';
import { CreateTriggerDto } from './dto/create-trigger.dto';
import { UpdateTriggerDto } from './dto/update-trigger.dto';
import { PrismaService } from '../../../common/prisma/prisma.service';

@ApiTags('rules')
@Controller('rules')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RuleEngineController {
  constructor(
    private readonly triggerService: TriggerService,
    private readonly executorService: WorkflowExecutorService,
    private readonly ruleEngine: RuleEngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('triggers')
  @ApiOperation({ summary: '创建触发器' })
  createTrigger(@Body() createDto: CreateTriggerDto) {
    return this.triggerService.create(createDto);
  }

  @Get('triggers')
  @ApiOperation({ summary: '获取触发器列表' })
  findTriggers(@Query('entityType') entityType?: string) {
    return this.triggerService.findAll(entityType);
  }

  @Get('triggers/enabled')
  @ApiOperation({ summary: '获取启用的触发器列表' })
  findEnabledTriggers(@Query('entityType') entityType?: string) {
    return this.triggerService.findEnabled(entityType);
  }

  @Get('triggers/:id')
  @ApiOperation({ summary: '获取触发器详情' })
  findOneTrigger(@Param('id') id: string) {
    return this.triggerService.findOne(id);
  }

  @Patch('triggers/:id')
  @ApiOperation({ summary: '更新触发器' })
  updateTrigger(@Param('id') id: string, @Body() updateDto: UpdateTriggerDto) {
    return this.triggerService.update(id, updateDto);
  }

  @Patch('triggers/:id/toggle')
  @ApiOperation({ summary: '启用/禁用触发器' })
  toggleTrigger(@Param('id') id: string, @Body('enabled') enabled: boolean) {
    return this.triggerService.toggleEnabled(id, enabled);
  }

  @Delete('triggers/:id')
  @ApiOperation({ summary: '删除触发器' })
  removeTrigger(@Param('id') id: string) {
    return this.triggerService.remove(id);
  }

  @Post('execute/:triggerId')
  @ApiOperation({ summary: '手动执行规则' })
  async executeRule(
    @Param('triggerId') triggerId: string,
    @Body('entityType') entityType: string,
    @Body('entityId') entityId: string,
    @Body('entityData') entityData: any,
  ) {
    return this.executorService.executeWorkflow(
      triggerId,
      entityType,
      entityId,
      entityData,
    );
  }

  @Get('logs')
  @ApiOperation({ summary: '获取执行日志' })
  async getLogs(
    @Query('triggerId') triggerId?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('limit') limit?: string,
  ) {
    const where: any = {};

    if (triggerId) where.triggerId = triggerId;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;

    return this.prisma.log.findMany({
      where,
      include: {
        details: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit ? parseInt(limit) : 50,
    });
  }
}
