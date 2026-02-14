import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { MenuService } from "./menu.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { UserInfo } from "../auth/interfaces/auth.interface";
import {
  MenuGroupDto,
  InitializeResultResponse,
  MenuItemDto,
} from "./dto/menu.dto";

@ApiTags("menus")
@Controller("menus")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get("user")
  @ApiOperation({
    summary: "获取当前用户的菜单树",
    description: "根据用户角色过滤菜单，返回按 groupTitle 分组的菜单结构",
  })
  @ApiResponse({
    status: 200,
    description: "操作成功",
    type: [MenuGroupDto],
  })
  getUserMenus(@CurrentUser() user: UserInfo): Promise<MenuGroupDto[]> {
    return this.menuService.getUserMenus(user.userId, user.isAdmin);
  }

  @Post("initialize")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "初始化菜单数据",
    description: "创建默认菜单结构和按钮权限，使用 upsert 模式可重复调用。",
  })
  @ApiResponse({
    status: 200,
    description: "操作成功",
    type: InitializeResultResponse,
  })
  async initializeMenus(): Promise<{
    menusCreated: number;
    menusUpdated: number;
    permissionsCreated: number;
    permissionsSkipped: number;
  }> {
    const result = await this.menuService.initializeMenus();
    return {
      menusCreated: result.menus.created,
      menusUpdated: result.menus.updated,
      permissionsCreated: result.permissions.created,
      permissionsSkipped: result.permissions.skipped,
    };
  }

  @Get("all")
  @ApiOperation({
    summary: "获取所有菜单（树形结构）",
    description:
      "返回所有启用的菜单和按钮，用于角色权限配置。返回树形结构，包含父子关系。",
  })
  @ApiResponse({
    status: 200,
    description: "操作成功",
    type: [MenuItemDto],
  })
  getAllMenus(): Promise<any[]> {
    return this.menuService.getAllMenusTree();
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "删除菜单",
    description: "删除指定菜单，如果有子菜单则无法删除",
  })
  @ApiResponse({
    status: 204,
    description: "删除成功",
  })
  @ApiResponse({
    status: 400,
    description: "菜单下存在子菜单，无法删除",
  })
  @ApiResponse({
    status: 404,
    description: "菜单不存在",
  })
  async deleteMenu(@Param("id") id: string): Promise<void> {
    return this.menuService.deleteMenu(id);
  }
}
