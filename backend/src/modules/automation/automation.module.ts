import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AutomationService } from './automation.service';
import { AutomationController } from './automation.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ContractExpiryProcessor } from './processors/contract-expiry.processor';
import { NewCustomerFollowProcessor } from './processors/new-customer-follow.processor';
import { MonthlyTaskProcessor } from './processors/monthly-task.processor';
import { NotificationProcessor } from './processors/notification.processor';

@Module({
  imports: [
    PrismaModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_DB', 0),
        },
      }),
    }),
    BullModule.registerQueue(
      {
        name: 'automation',
      },
      {
        name: 'notifications',
      },
    ),
  ],
  controllers: [AutomationController],
  providers: [
    AutomationService,
    ContractExpiryProcessor,
    NewCustomerFollowProcessor,
    MonthlyTaskProcessor,
    NotificationProcessor,
  ],
  exports: [AutomationService],
})
export class AutomationModule {}
