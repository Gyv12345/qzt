import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LoginLogsService } from './login-logs.service';
import { QueryLoginLogDto } from './dto/query-login-log.dto';

@ApiTags('login-logs')
@Controller('login-logs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class LoginLogsController {
  constructor(private readonly loginLogsService: LoginLogsService) {}

  @Get()
  @ApiOperation({ summary: '分页查询登录日志' })
  @ApiResponse({ status: 200, description: '查询成功' })
  findLoginLogs(@Query() query: QueryLoginLogDto) {
    return this.loginLogsService.findLoginLogs(query);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取登录日志详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  @ApiResponse({ status: 404, description: '日志不存在' })
  findOne(@Param('id') id: string) {
    return this.loginLogsService.findOne(id);
  }
}
