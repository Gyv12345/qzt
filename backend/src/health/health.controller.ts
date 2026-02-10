import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { PrismaService } from "../common/prisma/prisma.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: "健康检查" })
  @ApiResponse({ status: 200, description: "服务正常运行" })
  async check() {
    const startTime = Date.now();
    let dbStatus = "unknown";
    let dbError: string | undefined;

    // 检查数据库连接
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = "healthy";
    } catch (error) {
      dbStatus = "unhealthy";
      dbError = error instanceof Error ? error.message : "Unknown error";
    }

    const responseTime = Date.now() - startTime;
    const isHealthy = dbStatus === "healthy";

    return {
      status: isHealthy ? "ok" : "error",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      services: {
        database: {
          status: dbStatus,
          error: dbError,
        },
      },
      environment: {
        nodeEnv: process.env.NODE_ENV || "development",
        backendPort: process.env.BACKEND_PORT || 3456,
      },
    };
  }

  @Get("ping")
  @ApiOperation({ summary: "简单心跳检查" })
  @ApiResponse({ status: 200, description: "pong" })
  ping() {
    return "pong";
  }
}
