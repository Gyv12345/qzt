import { Module } from '@nestjs/common';
import { CustomerContactService } from './customer-contact.service';
import { CustomerContactController } from './customer-contact.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CustomerContactController],
  providers: [CustomerContactService],
  exports: [CustomerContactService],
})
export class CustomerContactModule {}
