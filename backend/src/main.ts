import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Module } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";
import {
  getDatabaseUrl,
  databaseConfig,
} from "./config/modules/database.config";
import { appConfig } from "./config/modules/app.config";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import {
  LoggingInterceptor,
  TimeoutInterceptor,
  TransformInterceptor,
  PerformanceInterceptor,
} from "./common/interceptors";
import {
  RequestIdMiddleware,
  OperationLogMiddleware,
} from "./common/middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn", "debug", "verbose"],
  });

  // 获取 ConfigService 实例
  const configService = app.get(ConfigService);

  // 设置 DATABASE_URL for Prisma（使用新配置系统）
  process.env.DATABASE_URL = getDatabaseUrl(configService);
  const dbConfig = databaseConfig(configService);
  const appCfg = appConfig(configService);

  // ========== 中间件配置 ==========
  // 请求ID中间件（必须第一个）
  const requestIdMiddleware = new (
    await import("./common/middleware/request-id.middleware.js")
  ).RequestIdMiddleware();
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));

  // 操作日志中间件（使用延迟初始化避免循环依赖）
  const operationLogMiddleware = new (
    await import("./common/middleware/operation-log.middleware.js")
  ).OperationLogMiddleware();
  app.use(operationLogMiddleware.use.bind(operationLogMiddleware));

  // ========== 拦截器配置 ==========
  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 响应格式标准化拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  // 请求日志拦截器
  app.useGlobalInterceptors(new LoggingInterceptor());

  // 性能监控拦截器
  app.useGlobalInterceptors(new PerformanceInterceptor());

  // 超时拦截器
  app.useGlobalInterceptors(new TimeoutInterceptor());

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 启用CORS - 安全配置
  const allowedOrigins = appCfg.corsOrigins || [
    appCfg.frontendUrl,
    "http://localhost:5180", // 开发环境 Next.js website 端口
    "http://localhost:3456", // 开发环境前端端口 (frontend)
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: appCfg.corsCredentials,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Swagger API文档
  const config = new DocumentBuilder()
    .setTitle("企智通SCRM API")
    .setDescription("企智通SCRM系统API文档")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document);

  const port = appCfg.port;
  await app.listen(port);

  // 输出配置信息
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  企智通 SCRM Backend                                      ║
╠════════════════════════════════════════════════════════════╣
║  🚀 Server: http://localhost:${port}                          ║
║  📚 API Docs: http://localhost:${port}/api-docs               ║
║  🔧 Environment: ${appCfg.env}                                   ║
║  💾 Database: ${dbConfig.provider}                              ║
╚════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
