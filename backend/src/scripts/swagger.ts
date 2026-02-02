import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../app.module';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function generateSwagger() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('企账通SCRM API')
    .setDescription('企账通SCRM系统API文档')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('认证', '用户认证相关接口')
    .addTag('客户', '客户管理相关接口')
    .addTag('合同', '合同管理相关接口')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const outputPath = join(process.cwd(), 'swagger.json');
  writeFileSync(outputPath, JSON.stringify(document, null, 2));

  console.log(`✅ Swagger JSON已生成: ${outputPath}`);

  await app.close();
}

generateSwagger();
