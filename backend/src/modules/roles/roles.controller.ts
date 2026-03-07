import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesService } from "./roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

/**
 * 角色管理控制器
 *
 * 提供角色的 CRUD 接口以及角色菜单关联管理
 */
@ApiTags("roles")
@Controller("roles")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "创建角色" })
  createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.createRole(createRoleDto);
  }

  @Get()
  @ApiOperation({ summary: "查询所有角色" })
  findAllRoles() {
    return this.rolesService.findAllRoles();
  }

  @Get(":id")
  @ApiOperation({ summary: "查询单个角色" })
  findOneRole(@Param("id") id: string) {
    return this.rolesService.findOneRole(id);
  }

  @Put(":id")
  @ApiOperation({ summary: "更新角色" })
  updateRole(@Param("id") id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.updateRole(id, updateRoleDto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "删除角色" })
  async removeRole(@Param("id") id: string) {
    await this.rolesService.removeRole(id);
  }

  @Get(":id/menus")
  @ApiOperation({ summary: "获取角色的菜单列表" })
  getRoleMenus(@Param("id") id: string) {
    return this.rolesService.getRoleMenus(id);
  }

  @Put(":id/menus")
  @ApiOperation({ summary: "为角色分配菜单" })
  assignMenusToRole(
    @Param("id") id: string,
    @Body() body: { menuIds: string[] },
  ) {
    return this.rolesService.assignMenusToRole(id, body.menuIds);
  }
}
