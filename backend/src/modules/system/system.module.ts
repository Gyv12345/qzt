import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { SystemConfigController } from './system-config.controller';
import { CommonPhraseService } from './services/common-phrase.service';
import { PaymentAccountService } from './services/payment-account.service';
import { SystemConfigService } from './system-config.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SystemController, SystemConfigController],
  providers: [CommonPhraseService, PaymentAccountService, SystemConfigService],
  exports: [CommonPhraseService, PaymentAccountService, SystemConfigService],
})
export class SystemModule {}
