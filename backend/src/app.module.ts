import { Module, Scope } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
import { BullModule } from "@nestjs/bullmq";
import { HealthModule } from "./health/health.module";
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
import { RolesModule } from "./modules/roles/roles.module";
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
import { CustomerRuleModule } from "./modules/customer-rules/customer-rule.module";
import { EsignModule } from "./modules/esign/esign.module";
import { SystemLogsModule } from "./modules/system-logs/system-logs.module";
import { MenuModule } from "./modules/menu/menu.module";
import { I18nModule, AcceptLanguageResolver } from "nestjs-i18n";
import * as path from "path";
import { Reflector } from "@nestjs/core";
import { validateEnv, type EnvConfig } from "./config";

/**
 * 环境变量验证函数
 *
 * 使用 Zod 验证环境变量，确保配置正确
 * 如果验证失败会抛出详细的错误信息
 */
function validateAppConfig(config: Record<string, unknown>): EnvConfig {
  try {
    return validateEnv(config);
  } catch (error: any) {
    console.error("❌ 环境变量验证失败:");
    console.error(error.message);
    console.error("\n💡 提示: 请检查 .env.local 文件配置");
    console.error("   运行 'pnpm tsx scripts/check-env.ts' 查看详细错误");
    throw error;
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // 环境文件加载优先级: 后面的文件会覆盖前面的
      // .env.local 优先于 .env (用于本地开发覆盖)
      envFilePath: [".env", ".env.local"],
      validate: validateAppConfig,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const enabled = configService.get<boolean>("REDIS_ENABLED", false);
        const host = configService.get<string>("REDIS_HOST");

        if (!enabled || !host) {
          // Redis 未启用时，使用内存模式（开发环境）
          return {
            connection: {
              host: "localhost",
              port: 6379,
            },
          };
        }

        return {
          connection: {
            host,
            port: configService.get<number>("REDIS_PORT", 6379),
            password: configService.get<string>("REDIS_PASSWORD") || undefined,
            db: configService.get<number>("REDIS_DB", 0),
          },
        };
      },
      inject: [ConfigService],
    }),
    I18nModule.forRoot({
      fallbackLanguage: "zh",
      loaderOptions: {
        path: path.join(__dirname, "../../src/i18n/"),
        watch: true,
      },
      resolvers: [AcceptLanguageResolver],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>("THROTTLE_TTL", 60000),
          limit: configService.get<number>("THROTTLE_LIMIT", 100),
        },
      ],
      inject: [ConfigService],
    }),
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
    RolesModule,
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
    CustomerRuleModule,
    EsignModule,
    SystemLogsModule,
    MenuModule,
    HealthModule,
  ],
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
