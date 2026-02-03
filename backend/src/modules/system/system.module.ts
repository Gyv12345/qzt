import { Module } from '@nestjs/common';
import { SystemController } from './system.controller';
import { CommonPhraseService } from './services/common-phrase.service';
import { PaymentAccountService } from './services/payment-account.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SystemController],
  providers: [CommonPhraseService, PaymentAccountService],
  exports: [CommonPhraseService, PaymentAccountService],
})
export class SystemModule {}
