import { ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsArray,
  IsIn,
} from "class-validator";
import type { UpdateUserBase } from "@qzt/shared-types/dist/user/schemas";

/**
 * 更新用户 DTO
 *
 * 从 @qzt/shared-types 继承类型，确保前后端类型一致
 * 所有字段都是可选的
 */
export class UpdateUserDto implements UpdateUserBase {
  @ApiPropertyOptional({ description: "用户名", example: "zhangsan" })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: "用户名不能为空" })
  @MaxLength(50, { message: "用户名最多50个字符" })
  username?: string;

  @ApiPropertyOptional({ description: "密码", example: "password123" })
  @IsOptional()
  @IsString()
  @MinLength(6, { message: "密码至少6个字符" })
  password?: string;

  @ApiPropertyOptional({ description: "姓名", example: "张三" })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: "姓名不能为空" })
  @MaxLength(50, { message: "姓名最多50个字符" })
  name?: string;

  @ApiPropertyOptional({
    description: "邮箱",
    example: "zhangsan@example.com",
    nullable: true,
  })
  @IsOptional()
  // 允许 null 用于清空，空字符串将由前端转换为 undefined
  email?: string | null;

  @ApiPropertyOptional({
    description: "手机号",
    example: "13800138000",
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: "手机号最多20个字符" })
  phone?: string | null;

  @ApiPropertyOptional({ description: "部门ID", example: "clxxx" })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({
    description: "角色ID列表",
    type: [String],
    example: ["clxxx1", "clxxx2"],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];

  @ApiPropertyOptional({
    description: "状态",
    example: "ACTIVE",
    enum: ["ACTIVE", "INACTIVE"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["ACTIVE", "INACTIVE"], { message: "状态必须是 ACTIVE 或 INACTIVE" })
  status?: "ACTIVE" | "INACTIVE";
}
