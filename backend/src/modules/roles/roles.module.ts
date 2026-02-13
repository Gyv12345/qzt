import { Module } from "@nestjs/common";
import { RolesService } from "./roles.service";
import { RolesController } from "./roles.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { DataScopeService } from "./services/data-scope.service";
import { DataScopeGuard } from "./guards/data-scope.guard";

/**
 * 角色管理模块
 *
 * 负责角色的 CRUD 操作以及角色与菜单的关联管理
 */
@Module({
  imports: [PrismaModule],
  controllers: [RolesController],
  providers: [RolesService, DataScopeService, DataScopeGuard],
  exports: [RolesService, DataScopeService, DataScopeGuard],
})
export class RolesModule {}
