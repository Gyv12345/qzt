import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import { HealthController } from './health/health.controller';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';

// 环境变量验证Schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production')
    .default('development'),

  // 数据库配置
  DATABASE_PROVIDER: Joi.string()
    .valid('sqlite', 'mysql')
    .default('sqlite'),
  DATABASE_URL: Joi.string()
    .when('DATABASE_PROVIDER', {
      is: 'sqlite',
      then: Joi.required(),
    }),
  DB_HOST: Joi.string()
    .when('DATABASE_PROVIDER', {
      is: 'mysql',
      then: Joi.required(),
    }),
  DB_PORT: Joi.number()
    .default(3306)
    .when('DATABASE_PROVIDER', {
      is: 'mysql',
      then: Joi.required(),
    }),
  DB_USERNAME: Joi.string()
    .when('DATABASE_PROVIDER', {
      is: 'mysql',
      then: Joi.required(),
    }),
  DB_PASSWORD: Joi.string()
    .when('DATABASE_PROVIDER', {
      is: 'mysql',
      then: Joi.required(),
    }),
  DB_DATABASE: Joi.string()
    .when('DATABASE_PROVIDER', {
      is: 'mysql',
      then: Joi.required(),
    }),

  // Redis配置
  REDIS_ENABLED: Joi.boolean()
    .default(false),
  REDIS_HOST: Joi.string()
    .when('REDIS_ENABLED', {
      is: true,
      then: Joi.required(),
    }),
  REDIS_PORT: Joi.number()
    .default(6379),
  REDIS_PASSWORD: Joi.string()
    .allow(''),
  REDIS_DB: Joi.number()
    .default(0),

  // JWT配置
  JWT_SECRET: Joi.string()
    .required(),
  JWT_EXPIRES_IN: Joi.string()
    .default('7d'),

  // 服务端口
  BACKEND_PORT: Joi.number()
    .default(3456),

  // 应用配置
  APP_NAME: Joi.string()
    .default('企账通'),
  APP_URL: Joi.string()
    .default('http://localhost:7890'),
  API_URL: Joi.string()
    .default('http://localhost:3456'),

  // 前端URL (用于CORS)
  FRONTEND_URL: Joi.string()
    .default('http://localhost:7890'),
}).unknown(true);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
      validationSchema: envSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    PrismaModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
