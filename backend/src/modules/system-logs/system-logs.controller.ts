import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { SystemLogsService } from "./system-logs.service";
import { GetSystemLogsDto } from "./dto/get-system-logs.dto";

@ApiTags("system-logs")
@Controller("system-logs")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SystemLogsController {
  constructor(private readonly systemLogsService: SystemLogsService) {}

  @Get(":type")
  @ApiOperation({ summary: "获取系统日志 (PM2/Nginx/Redis)" })
  @ApiParam({
    name: "type",
    enum: ["pm2", "nginx", "redis"],
    description: "日志类型",
  })
  @ApiQuery({
    name: "lines",
    required: false,
    type: Number,
    description: "返回的日志行数 (1-1000, 默认100)",
  })
  @ApiQuery({
    name: "level",
    required: false,
    type: String,
    description: "日志级别过滤 (error/warn/info/all)",
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "搜索关键词",
  })
  @ApiResponse({ status: 200, description: "获取成功" })
  @ApiResponse({ status: 400, description: "参数错误" })
  @ApiResponse({ status: 401, description: "未授权" })
  async getLogs(@Param("type") type: string, @Query() query: GetSystemLogsDto) {
    return this.systemLogsService.getLogs(type, {
      lines: query.lines || 100,
      level: query.level,
      search: query.search,
    });
  }
}
