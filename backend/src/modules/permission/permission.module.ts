import { Module } from "@nestjs/common";
import { PermissionService } from "./permission.service";
import { PermissionController } from "./permission.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { DataScopeService } from "./services/data-scope.service";
import { DataScopeGuard } from "./guards/data-scope.guard";
import { PermissionsGuard } from "./guards/permissions.guard";

@Module({
  imports: [PrismaModule],
  controllers: [PermissionController],
  providers: [
    PermissionService,
    DataScopeService,
    DataScopeGuard,
    PermissionsGuard,
  ],
  exports: [
    PermissionService,
    DataScopeService,
    DataScopeGuard,
    PermissionsGuard,
  ],
})
export class PermissionModule {}
