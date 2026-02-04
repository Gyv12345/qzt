import { Module, Global } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { AutomationModule } from '../automation/automation.module';

@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AutomationModule,
  ],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {}
