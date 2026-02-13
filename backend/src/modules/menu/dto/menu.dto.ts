import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber, IsBoolean } from "class-validator";

/**
 * 菜单项响应 DTO
 */
export class MenuItemDto {
  @ApiProperty({ description: "菜单ID" })
  id: string;

  @ApiProperty({ description: "路由路径" })
  path: string;

  @ApiProperty({ description: "菜单名称" })
  name: string;

  @ApiProperty({ description: "菜单标题" })
  title: string;

  @ApiProperty({ description: "国际化key", required: false })
  i18nKey?: string;

  @ApiProperty({ description: "图标名称", required: false })
  icon?: string;

  @ApiProperty({ description: "徽章文本", required: false })
  badge?: string;

  @ApiProperty({ description: "排序" })
  sort: number;

  @ApiProperty({ description: "是否启用" })
  enabled: boolean;
}

/**
 * 菜单组响应 DTO
 */
export class MenuGroupDto {
  @ApiProperty({ description: "分组标题" })
  title: string;

  @ApiProperty({ description: "国际化key", required: false })
  i18nKey?: string;

  @ApiProperty({ description: "菜单项列表", type: [MenuItemDto] })
  items: MenuItemDto[];
}

/**
 * 创建菜单 DTO
 */
export class CreateMenuDto {
  @ApiProperty({ description: "路由路径" })
  @IsString()
  path: string;

  @ApiProperty({ description: "菜单名称" })
  @IsString()
  name: string;

  @ApiProperty({ description: "分组标题" })
  @IsString()
  groupTitle: string;

  @ApiProperty({ description: "国际化key", required: false })
  @IsOptional()
  @IsString()
  i18nKey?: string;

  @ApiProperty({ description: "图标名称", required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: "父级菜单ID", required: false })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ description: "排序", required: false })
  @IsOptional()
  @IsNumber()
  sort?: number;

  @ApiProperty({ description: "是否启用", required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: "是否有子菜单", required: false })
  @IsOptional()
  hasChildren?: boolean;

  @ApiProperty({ description: "关联权限ID列表", required: false })
  @IsOptional()
  permissionIds?: string[];
}

/**
 * 初始化菜单 DTO
 */
export class InitializeMenuDto {
  @ApiProperty({ description: "菜单列表", type: [CreateMenuDto] })
  menus: CreateMenuDto[];
}

/**
 * 初始化菜单响应 DTO
 */
export class InitializeResultResponse {
  @ApiProperty({ description: "菜单创建数量" })
  menusCreated: number;

  @ApiProperty({ description: "菜单更新数量" })
  menusUpdated: number;

  @ApiProperty({ description: "权限创建数量" })
  permissionsCreated: number;

  @ApiProperty({ description: "权限跳过数量" })
  permissionsSkipped: number;
}

/**
 * 更新菜单 DTO
 */
export class UpdateMenuDto {
  @ApiProperty({ description: "菜单名称", required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: "路由路径", required: false })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiProperty({ description: "国际化key", required: false })
  @IsOptional()
  @IsString()
  i18nKey?: string;

  @ApiProperty({ description: "图标名称", required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: "徽章文本", required: false })
  @IsOptional()
  @IsString()
  badge?: string;

  @ApiProperty({ description: "父级菜单ID", required: false })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ description: "排序", required: false })
  @IsOptional()
  @IsNumber()
  sort?: number;

  @ApiProperty({ description: "是否启用", required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: "是否隐藏", required: false })
  @IsOptional()
  @IsBoolean()
  isHidden?: boolean;

  @ApiProperty({ description: "菜单分组标题", required: false })
  @IsOptional()
  @IsString()
  groupTitle?: string;

  @ApiProperty({ description: "关联权限ID列表", required: false })
  @IsOptional()
  permissionIds?: string[];
}

/**
 * 查询菜单 DTO
 */
export class QueryMenuDto {
  @ApiProperty({ description: "是否只查询启用的菜单", required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({ description: "父级菜单ID", required: false })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ description: "搜索关键词", required: false })
  @IsOptional()
  @IsString()
  keyword?: string;
}

/**
 * 菜单排序项 DTO
 */
export class MenuOrderItemDto {
  @ApiProperty({ description: "菜单ID" })
  @IsString()
  id: string;

  @ApiProperty({ description: "新排序值" })
  @IsNumber()
  sort: number;
}

/**
 * 批量排序 DTO
 */
export class ReorderMenuDto {
  @ApiProperty({ description: "菜单排序项列表", type: [MenuOrderItemDto] })
  items: MenuOrderItemDto[];
}

/**
 * 菜单详情响应 DTO（包含权限信息）
 */
export class MenuDetailDto extends MenuItemDto {
  @ApiProperty({ description: "父级菜单ID", required: false })
  parentId?: string;

  @ApiProperty({ description: "分组标题", required: false })
  groupTitle?: string;

  @ApiProperty({ description: "国际化key", required: false })
  i18nKey?: string;

  @ApiProperty({ description: "徽章文本", required: false })
  badge?: string;

  @ApiProperty({ description: "是否隐藏" })
  isHidden: boolean;

  @ApiProperty({ description: "是否系统菜单" })
  isSystem: boolean;

  @ApiProperty({ description: "状态(0:禁用 1:启用)" })
  status: number;

  @ApiProperty({ description: "创建时间" })
  createdAt: Date;

  @ApiProperty({ description: "更新时间" })
  updatedAt: Date;

  @ApiProperty({
    description: "关联的权限列表",
    type: [Object],
    required: false,
  })
  permissions?: Array<{
    id: string;
    name: string;
    code: string;
    type: string;
    description?: string;
  }>;

  @ApiProperty({
    description: "子菜单列表",
    type: [MenuItemDto],
    required: false,
  })
  children?: MenuItemDto[];
}
