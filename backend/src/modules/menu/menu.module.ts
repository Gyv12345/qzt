import { Module, OnModuleInit } from "@nestjs/common";
import { MenuService } from "./menu.service";
import { MenuController } from "./menu.controller";
import { PrismaModule } from "../../common/prisma/prisma.module";
import { Logger } from "@nestjs/common";

@Module({
  imports: [PrismaModule],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule implements OnModuleInit {
  private readonly logger = new Logger(MenuModule.name);

  constructor(private readonly menuService: MenuService) {}

  async onModuleInit(): Promise<void> {
    this.logger.log("正在初始化菜单权限数据...");
    try {
      const result = await this.menuService.initializeMenus();
      this.logger.log(
        `菜单初始化完成: 菜单[创建 ${result.menus.created}, 跳过 ${result.menus.skipped}], 权限[创建 ${result.permissions.created}, 跳过 ${result.permissions.skipped}]`,
      );
    } catch (error) {
      this.logger.error("菜单初始化失败", error);
    }
  }
}
