import { Module } from '@nestjs/common';
import { RuleEngineController } from './rule-engine.controller';
import { TriggerService } from './services/trigger.service';
import { RuleEngineService } from './services/rule-engine.service';
import { WorkflowExecutorService } from './services/workflow-executor.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RuleEngineController],
  providers: [
    TriggerService,
    RuleEngineService,
    WorkflowExecutorService,
  ],
  exports: [TriggerService, RuleEngineService, WorkflowExecutorService],
})
export class RuleEngineModule {}
