import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  IsEnum,
} from "class-validator";

export enum RoleType {
  SYSTEM = "system", // 系统角色
  TEAM = "team", // 团队角色
}

export enum DataScopeType {
  ALL = "all", // 查看全部数据
  DEPARTMENT = "department", // 仅查看本部门数据
  DEPARTMENT_AND_SUB = "department_and_sub", // 查看本部门及下级部门数据
  CUSTOM = "custom", // 自定义部门
  SELF = "self", // 仅查看本人数据
}

export class CreateRoleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RoleType)
  @IsOptional()
  type?: RoleType;

  @IsEnum(DataScopeType)
  @IsOptional()
  dataScope?: DataScopeType;

  @IsString()
  @IsOptional()
  dataScopeDeptIds?: string; // JSON字符串，自定义部门ID列表

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  menuIds?: string[];
}
