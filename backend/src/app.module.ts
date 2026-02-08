import { Module, Scope } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { BullModule } from "@nestjs/bullmq";
import * as Joi from "joi";
import { HealthController } from "./health/health.controller";
import { PrismaModule } from "./common/prisma/prisma.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ContactModule } from "./modules/contact/contact.module";
import { CustomerContactModule } from "./modules/customer-contact/customer-contact.module";
import { CustomerModule } from "./modules/customer/customer.module";
import { FollowRecordModule } from "./modules/follow-record/follow-record.module";
import { ProductModule } from "./modules/product/product.module";
import { ContractModule } from "./modules/contract/contract.module";
import { PaymentModule } from "./modules/payment/payment.module";
import { InvoiceModule } from "./modules/invoice/invoice.module";
import { StatisticsModule } from "./modules/statistics/statistics.module";
import { ServiceTeamModule } from "./modules/service-team/service-team.module";
import { SystemModule } from "./modules/system/system.module";
import { PricingModule } from "./modules/pricing/pricing.module";
import { PermissionModule } from "./modules/permission/permission.module";
import { UsersModule } from "./modules/users/users.module";
import { DepartmentModule } from "./modules/department/department.module";
import { LogsModule } from "./modules/logs/logs.module";
import { LoginLogsModule } from "./modules/login-logs/login-logs.module";
import { TwoFactorModule } from "./modules/two-factor/two-factor.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { OssModule } from "./modules/oss/oss.module";
import { SocialMediaModule } from "./modules/social-media/social-media.module";
import { PaymentOrderModule } from "./modules/payment-order/payment-order.module";
import { SchedulerModule } from "./modules/scheduler/scheduler.module";
import { NotificationModule } from "./modules/notification/notification.module";
import { CmsModule } from "./modules/cms/cms.module";
import { I18nModule, AcceptLanguageResolver } from "nestjs-i18n";
import * as path from "path";
import { Reflector } from "@nestjs/core";

// 环境变量验证Schema
const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production")
    .default("development"),

  // 数据库配置
  DATABASE_PROVIDER: Joi.string().valid("sqlite", "mysql").default("sqlite"),
  DATABASE_URL: Joi.string().when("DATABASE_PROVIDER", {
    is: "sqlite",
    then: Joi.required(),
  }),
  DB_HOST: Joi.string().when("DATABASE_PROVIDER", {
    is: "mysql",
    then: Joi.required(),
  }),
  DB_PORT: Joi.number().default(3306).when("DATABASE_PROVIDER", {
    is: "mysql",
    then: Joi.required(),
  }),
  DB_USERNAME: Joi.string().when("DATABASE_PROVIDER", {
    is: "mysql",
    then: Joi.required(),
  }),
  DB_PASSWORD: Joi.string().when("DATABASE_PROVIDER", {
    is: "mysql",
    then: Joi.required(),
  }),
  DB_DATABASE: Joi.string().when("DATABASE_PROVIDER", {
    is: "mysql",
    then: Joi.required(),
  }),

  // Redis配置
  REDIS_ENABLED: Joi.boolean().default(false),
  REDIS_HOST: Joi.string().when("REDIS_ENABLED", {
    is: true,
    then: Joi.required(),
  }),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow(""),
  REDIS_DB: Joi.number().default(0),

  // JWT配置
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default("7d"),

  // 服务端口
  BACKEND_PORT: Joi.number().default(3456),

  // 应用配置
  APP_NAME: Joi.string().default("企智通"),
  APP_URL: Joi.string().default("http://localhost:7890"),
  API_URL: Joi.string().default("http://localhost:3456"),

  // 前端URL (用于CORS)
  FRONTEND_URL: Joi.string().default("http://localhost:7890"),

  // TOTP 2FA 配置
  TOTP_APP_NAME: Joi.string().default("企智通"),
  TOTP_ENCRYPTION_KEY: Joi.string().optional(),

  // 并发优化配置
  PM2_CLUSTER_ENABLED: Joi.boolean().default(false),
  THROTTLE_TTL: Joi.number().default(60000),
  THROTTLE_LIMIT: Joi.number().default(100),
}).unknown(true);

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || "development"}`,
      validationSchema: envSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : 6379,
        password: process.env.REDIS_PASSWORD || undefined,
        db: process.env.REDIS_DB ? Number(process.env.REDIS_DB) : 0,
      },
    }),
    I18nModule.forRoot({
      fallbackLanguage: "zh",
      loaderOptions: {
        path: path.join(__dirname, "../../src/i18n/"),
        watch: true,
      },
      resolvers: [AcceptLanguageResolver],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: Number(process.env.THROTTLE_TTL) || 60000,
        limit: Number(process.env.THROTTLE_LIMIT) || 100,
      },
    ]),
    // ScheduleModule.forRoot(), // 暂时禁用：Reflector 依赖问题
    PrismaModule,
    AuthModule,
    ContactModule,
    CustomerContactModule,
    CustomerModule,
    FollowRecordModule,
    ProductModule,
    ContractModule,
    PaymentModule,
    InvoiceModule,
    StatisticsModule,
    ServiceTeamModule,
    SystemModule,
    PricingModule,
    PermissionModule,
    UsersModule,
    DepartmentModule,
    LogsModule,
    LoginLogsModule,
    TwoFactorModule,
    WebhooksModule,
    OssModule,
    SocialMediaModule,
    PaymentOrderModule,
    SchedulerModule,
    NotificationModule,
    CmsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: "APP_REFLECTOR",
      useClass: Reflector,
      scope: Scope.TRANSIENT,
    },
    Reflector,
  ],
})
export class AppModule {}
