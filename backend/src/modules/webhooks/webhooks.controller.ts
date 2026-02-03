import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookConfigDto } from './dto/create-webhook-config.dto';
import { UpdateWebhookConfigDto } from './dto/update-webhook-config.dto';
import { SendWebhookDto } from './dto/send-webhook.dto';
import { TestWebhookDto } from './dto/test-webhook.dto';

@ApiTags('webhook')
@Controller('webhook')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('send')
  @ApiOperation({ summary: '发送 Webhook 消息' })
  @ApiResponse({ status: 200, description: '发送成功' })
  @ApiResponse({ status: 404, description: 'Webhook 配置不存在' })
  sendMessage(@Body() sendWebhookDto: SendWebhookDto) {
    return this.webhooksService.sendMessage(sendWebhookDto);
  }

  @Get('configs')
  @ApiOperation({ summary: '获取 Webhook 配置列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findConfigs() {
    return this.webhooksService.findConfigs();
  }

  @Post('configs')
  @ApiOperation({ summary: '创建 Webhook 配置' })
  @ApiResponse({ status: 201, description: '创建成功' })
  createConfig(@Body() createWebhookConfigDto: CreateWebhookConfigDto) {
    return this.webhooksService.createConfig(createWebhookConfigDto);
  }

  @Patch('configs/:id')
  @ApiOperation({ summary: '更新 Webhook 配置' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: 'Webhook 配置不存在' })
  updateConfig(
    @Param('id') id: string,
    @Body() updateWebhookConfigDto: UpdateWebhookConfigDto,
  ) {
    return this.webhooksService.updateConfig(id, updateWebhookConfigDto);
  }

  @Delete('configs/:id')
  @ApiOperation({ summary: '删除 Webhook 配置' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: 'Webhook 配置不存在' })
  removeConfig(@Param('id') id: string) {
    return this.webhooksService.removeConfig(id);
  }

  @Post('test')
  @ApiOperation({ summary: '测试 Webhook 发送' })
  @ApiResponse({ status: 200, description: '测试成功' })
  testSend(@Body() testWebhookDto: TestWebhookDto) {
    return this.webhooksService.testSend(testWebhookDto.webhookUrl, testWebhookDto.platform);
  }
}
