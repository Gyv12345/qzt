import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AutomationService } from './automation.service';
import { CreateAutomationRuleDto } from './dto/create-automation-rule.dto';
import { UpdateAutomationRuleDto } from './dto/update-automation-rule.dto';

@ApiTags('automation')
@Controller('automation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AutomationController {
  constructor(private readonly automationService: AutomationService) {}

  @Post('rules')
  @ApiOperation({ summary: '创建自动化规则' })
  createRule(@Body() createAutomationRuleDto: CreateAutomationRuleDto) {
    return this.automationService.create(createAutomationRuleDto);
  }

  @Get('rules')
  @ApiOperation({ summary: '查询所有自动化规则' })
  findAllRules() {
    return this.automationService.findAll();
  }

  @Get('rules/:id')
  @ApiOperation({ summary: '查询单个规则' })
  findOneRule(@Param('id') id: string) {
    return this.automationService.findOne(id);
  }

  @Patch('rules/:id')
  @ApiOperation({ summary: '更新规则' })
  updateRule(
    @Param('id') id: string,
    @Body() updateAutomationRuleDto: UpdateAutomationRuleDto,
  ) {
    return this.automationService.update(id, updateAutomationRuleDto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: '删除规则' })
  removeRule(@Param('id') id: string) {
    return this.automationService.remove(id);
  }

  @Patch('rules/:id/toggle')
  @ApiOperation({ summary: '启用/禁用规则' })
  toggleEnabled(@Param('id') id: string) {
    return this.automationService.toggleEnabled(id);
  }

  @Post('rules/:id/trigger')
  @ApiOperation({ summary: '手动触发规则' })
  triggerRule(@Param('id') id: string) {
    return this.automationService.triggerRule(id);
  }

  @Get('tasks/history')
  @ApiOperation({ summary: '查询任务执行历史' })
  getTaskHistory(
    @Query('ruleId') ruleId?: string,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.automationService.getTaskHistory(ruleId, page, pageSize);
  }

  @Get('notifications')
  @ApiOperation({ summary: '查询当前用户通知' })
  getNotifications(@Query('unreadOnly') unreadOnly?: boolean) {
    // TODO: 从JWT中获取userId
    const userId = 'current-user-id';
    return this.automationService.getUserNotifications(userId, unreadOnly);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: '标记通知为已读' })
  markNotificationAsRead(@Param('id') id: string) {
    // TODO: 从JWT中获取userId
    const userId = 'current-user-id';
    return this.automationService.markNotificationAsRead(id, userId);
  }

  @Patch('notifications/read-all')
  @ApiOperation({ summary: '标记所有通知为已读' })
  markAllNotificationsAsRead() {
    // TODO: 从JWT中获取userId
    const userId = 'current-user-id';
    return this.automationService.markAllNotificationsAsRead(userId);
  }
}
