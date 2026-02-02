import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { getDatabaseUrl } from './config/database.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {

  // 设置DATABASE_URL for Prisma
  process.env.DATABASE_URL = getDatabaseUrl();

  const app = await NestFactory.create(AppModule);

  // 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 启用CORS - 安全配置
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3456',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger API文档
  const config = new DocumentBuilder()
    .setTitle('企账通SCRM API')
    .setDescription('企账通SCRM系统API文档')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = process.env.BACKEND_PORT || 7890;
  await app.listen(port);

  console.log(`
🚀 Application is running on: http://localhost:${port}
📚 API Documentation: http://localhost:${port}/api-docs
  `);
}

bootstrap();
