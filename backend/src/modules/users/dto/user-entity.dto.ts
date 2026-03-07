import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserStatus } from "./user-status.dto";

export class UserRoleDto {
  @ApiProperty({ description: "角色ID" })
  id: string;

  @ApiProperty({ description: "角色名称" })
  name: string;

  @ApiProperty({ description: "角色代码" })
  code: string;
}

export class UserRoleWithRelation {
  @ApiProperty({ description: "角色信息", type: () => UserRoleDto })
  role: UserRoleDto;
}

export class DepartmentDto {
  @ApiProperty({ description: "部门ID" })
  id: string;

  @ApiProperty({ description: "部门名称" })
  name: string;
}

export class UserEntity {
  @ApiProperty({ description: "用户ID" })
  id: string;

  @ApiProperty({ description: "用户名" })
  username: string;

  @ApiProperty({ description: "姓名" })
  name: string;

  @ApiPropertyOptional({ description: "邮箱" })
  email?: string;

  @ApiPropertyOptional({ description: "手机号" })
  phone?: string;

  @ApiPropertyOptional({ description: "头像" })
  avatar?: string;

  @ApiPropertyOptional({ description: "部门ID" })
  departmentId?: string;

  @ApiPropertyOptional({ description: "部门信息", type: () => DepartmentDto })
  department?: DepartmentDto;

  @ApiProperty({
    description: "状态",
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  status: string;

  @ApiPropertyOptional({ description: "是否为系统用户" })
  isSystem?: boolean;

  @ApiPropertyOptional({
    description: "角色列表",
    type: () => [UserRoleWithRelation],
  })
  roles?: UserRoleWithRelation[];

  @ApiProperty({ description: "创建时间" })
  createdAt: Date;

  @ApiProperty({ description: "更新时间" })
  updatedAt: Date;
}

// 分页响应包装类
export class PaginatedUsersDto {
  @ApiProperty({ description: "用户列表", type: () => [UserEntity] })
  data: UserEntity[];

  @ApiProperty({ description: "总记录数" })
  total: number;

  @ApiProperty({ description: "当前页码" })
  page: number;

  @ApiProperty({ description: "每页数量" })
  pageSize: number;

  @ApiProperty({ description: "总页数" })
  totalPages: number;
}
