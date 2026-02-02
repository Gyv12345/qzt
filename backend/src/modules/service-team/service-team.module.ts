import { Module } from '@nestjs/common';
import { ServiceTeamService } from './service-team.service';
import { ServiceTeamController } from './service-team.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceTeamController],
  providers: [ServiceTeamService],
  exports: [ServiceTeamService],
})
export class ServiceTeamModule {}
