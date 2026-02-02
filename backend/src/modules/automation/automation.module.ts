import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
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
    ScheduleModule.forRoot(),
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
