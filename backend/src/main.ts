import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Module } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { getDatabaseUrl } from "./config/database.config";
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
  // 设置DATABASE_URL for Prisma
  process.env.DATABASE_URL = getDatabaseUrl();

  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn", "debug", "verbose"],
  });

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
  const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:3456",
    process.env.WEBSITE_URL || "http://localhost:5180",
    "http://localhost:5180", // 开发环境 Next.js website 端口
    "http://localhost:3456", // 开发环境前端端口 (frontend)
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
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

  const port = process.env.BACKEND_PORT || 7890;
  await app.listen(port);

  console.log(`
🚀 Application is running on: http://localhost:${port}
📚 API Documentation: http://localhost:${port}/api-docs
  `);
}

bootstrap();
