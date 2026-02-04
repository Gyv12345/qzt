import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { AutomationModule } from '../automation/automation.module';
import { Reflector } from '@nestjs/core';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AutomationModule,
  ],
  providers: [
    SchedulerService,
    {
      provide: 'Reflector',
      useClass: Reflector,
    },
  ],
  exports: [SchedulerService],
})
export class SchedulerModule {}
