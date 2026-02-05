import { Module } from '@nestjs/common';
import { PermissionService } from './permission.service';
import { PermissionController } from './permission.controller';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { DataScopeService } from './services/data-scope.service';
import { DataScopeGuard } from './guards/data-scope.guard';

@Module({
  imports: [PrismaModule],
  controllers: [PermissionController],
  providers: [PermissionService, DataScopeService, DataScopeGuard],
  exports: [PermissionService, DataScopeService, DataScopeGuard],
})
export class PermissionModule {}
