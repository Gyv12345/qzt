import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionService } from './permission.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { PermissionType } from './dto/create-permission.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';

@ApiTags('permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  @Post('sync-menus')
  @ApiOperation({ summary: '同步前端路由到菜单' })
  syncMenus(@Body() routes: any[]) {
    return this.permissionService.syncMenus(routes);
  }

  @Get('menus')
  @ApiOperation({ summary: '获取菜单树' })
  getMenuTree() {
    return this.permissionService.getMenuTree();
  }

  @Put('menus/:id')
  @ApiOperation({ summary: '更新菜单' })
  updateMenu(@Param('id') id: string, @Body() data: any) {
    return this.permissionService.updateMenu(id, data);
  }

  @Post('permissions')
  @ApiOperation({ summary: '创建权限' })
  createPermission(@Body() createPermissionDto: CreatePermissionDto) {
    return this.permissionService.createPermission(createPermissionDto);
  }

  @Get('permissions')
  @ApiOperation({ summary: '查询所有权限' })
  findAllPermissions(@Query('type') type?: string) {
    return this.permissionService.findAllPermissions(type as PermissionType);
  }

  @Post('roles')
  @ApiOperation({ summary: '创建角色' })
  createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.permissionService.createRole(createRoleDto);
  }

  @Get('roles')
  @ApiOperation({ summary: '查询所有角色' })
  findAllRoles() {
    return this.permissionService.findAllRoles();
  }

  @Get('roles/:id')
  @ApiOperation({ summary: '查询单个角色' })
  findOneRole(@Param('id') id: string) {
    return this.permissionService.findOneRole(id);
  }

  @Put('roles/:id')
  @ApiOperation({ summary: '更新角色' })
  updateRole(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.permissionService.updateRole(id, updateRoleDto);
  }

  @Delete('roles/:id')
  @ApiOperation({ summary: '删除角色' })
  removeRole(@Param('id') id: string) {
    return this.permissionService.removeRole(id);
  }

  @Put('roles/:id/permissions')
  @ApiOperation({ summary: '为角色分配权限' })
  assignPermissionsToRole(
    @Param('id') id: string,
    @Body() body: { permissionIds: string[] },
  ) {
    return this.permissionService.assignPermissionsToRole(id, body.permissionIds);
  }

  @Get('users/:id/permissions')
  @ApiOperation({ summary: '获取用户的所有权限' })
  getUserPermissions(@Param('id') id: string) {
    return this.permissionService.getUserPermissions(id);
  }

  @Put('users/:id/roles')
  @ApiOperation({ summary: '为用户分配角色' })
  assignRolesToUser(
    @Param('id') id: string,
    @Body() body: { roleIds: string[] },
  ) {
    return this.permissionService.assignRolesToUser(id, body.roleIds);
  }

  @Post('initialize-super-admin')
  @ApiOperation({ summary: '初始化超级管理员' })
  initializeSuperAdmin() {
    return this.permissionService.initializeSuperAdmin();
  }
}
