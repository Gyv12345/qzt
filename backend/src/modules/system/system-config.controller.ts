import {
  Controller,
  Get,
  Post,
  Put,
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
import { SystemConfigService } from './system-config.service';

@ApiTags('系统设置')
@Controller('system/config')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  @ApiOperation({ summary: '获取所有系统配置' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findAll(@Param('category') category?: string) {
    return this.systemConfigService.findAll(category);
  }

  @Get('public')
  @ApiOperation({ summary: '获取公开配置（无需认证）' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findPublic() {
    return this.systemConfigService.findPublic();
  }

  @Get('basic')
  @ApiOperation({ summary: '获取基础配置（系统名称、Logo等）' })
  @ApiResponse({ status: 200, description: '查询成功' })
  getBasicConfig() {
    return this.systemConfigService.getBasicConfig();
  }

  @Get(':key')
  @ApiOperation({ summary: '获取单个配置' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findOne(@Param('key') key: string) {
    return this.systemConfigService.findOne(key);
  }

  @Put(':key')
  @ApiOperation({ summary: '创建或更新配置' })
  @ApiResponse({ status: 200, description: '操作成功' })
  upsert(
    @Param('key') key: string,
    @Body() data: {
      value: string;
      category: string;
      description?: string;
      isPublic?: boolean;
    },
  ) {
    return this.systemConfigService.upsert(key, data);
  }

  @Post('batch')
  @ApiOperation({ summary: '批量更新配置' })
  @ApiResponse({ status: 200, description: '操作成功' })
  batchUpdate(@Body() data: {
    configs: Array<{
      key: string;
      value: string;
      category: string;
      description?: string;
      isPublic?: boolean;
    }>;
  }) {
    return this.systemConfigService.batchUpdate(data.configs);
  }

  @Delete(':key')
  @ApiOperation({ summary: '删除配置' })
  @ApiResponse({ status: 200, description: '删除成功' })
  remove(@Param('key') key: string) {
    return this.systemConfigService.remove(key);
  }
}
