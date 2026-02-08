import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { SystemConfigService } from "./system-config.service";

@ApiTags("public-system-config")
@Controller("public/system")
export class SystemPublicController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get("config")
  @ApiOperation({ summary: "获取公开配置（无需认证）" })
  @ApiResponse({ status: 200, description: "查询成功" })
  findPublic() {
    return this.systemConfigService.findPublic();
  }

  @Get("login-config")
  @ApiOperation({ summary: "获取登录页配置（无需认证）" })
  @ApiResponse({ status: 200, description: "查询成功" })
  getLoginConfig() {
    return this.systemConfigService.getLoginConfig();
  }
}
