import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiProduces,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LogsService } from './logs.service';
import { QueryOperationLogDto } from './dto/query-operation-log.dto';
import { QuerySystemLogDto } from './dto/query-system-log.dto';
import { ExportLogDto } from './dto/export-log.dto';

@ApiTags('logs')
@Controller('logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get('operations')
  @ApiOperation({ summary: '分页查询操作日志' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findOperationLogs(@Query() query: QueryOperationLogDto) {
    return this.logsService.findOperationLogs(query);
  }

  @Get('system')
  @ApiOperation({ summary: '分页查询系统日志' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findSystemLogs(@Query() query: QuerySystemLogDto) {
    return this.logsService.findSystemLogs(query);
  }

  @Get(':type/:id')
  @ApiOperation({ summary: '获取日志详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '日志不存在' })
  findOne(@Param('type') type: 'operation' | 'system', @Param('id') id: string) {
    return this.logsService.findOne(type, id);
  }

  @Post('export')
  @ApiOperation({ summary: '导出日志为 CSV' })
  @ApiResponse({ status: 200, description: '导出成功', content: { 'text/csv': {} } })
  @ApiProduces('text/csv')
  async exportToCsv(@Body() exportLogDto: ExportLogDto) {
    const csv = await this.logsService.exportToCsv(exportLogDto);
    return csv;
  }
}
