import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsEmail,
  IsOptional,
  MinLength,
  MaxLength,
  IsArray,
  IsIn,
} from "class-validator";
// 类型定义参考 @qzt/shared-types/dist/user/schemas

/**
 * 创建用户 DTO
 *
 * 类型对应 shared-types 中的 UserBase
 */
export class CreateUserDto {
  @ApiProperty({ description: "用户名", example: "zhangsan" })
  @IsString()
  @MinLength(1, { message: "用户名不能为空" })
  @MaxLength(50, { message: "用户名最多50个字符" })
  username: string;

  @ApiProperty({ description: "密码", example: "password123" })
  @IsString()
  @MinLength(6, { message: "密码至少6个字符" })
  password: string;

  @ApiProperty({ description: "姓名", example: "张三" })
  @IsString()
  @MinLength(1, { message: "姓名不能为空" })
  @MaxLength(50, { message: "姓名最多50个字符" })
  name: string;

  @ApiPropertyOptional({
    description: "邮箱",
    example: "zhangsan@example.com",
  })
  @IsOptional()
  @IsEmail({}, { message: "请输入有效的邮箱地址" })
  email?: string;

  @ApiPropertyOptional({ description: "手机号", example: "13800138000" })
  @IsOptional()
  @IsString()
  @MaxLength(20, { message: "手机号最多20个字符" })
  phone?: string;

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
