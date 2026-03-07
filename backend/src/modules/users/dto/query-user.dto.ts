import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min, IsIn } from "class-validator";
import { Type } from "class-transformer";
// 类型定义参考 @qzt/shared-types/dist/user/schemas

/**
 * 查询用户 DTO
 *
 * 类型对应 shared-types 中的 QueryUserParams
 */
export class QueryUserDto {
  @ApiPropertyOptional({ description: "页码", example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: "搜索关键词" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: "部门ID" })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({
    description: "状态",
    enum: ["ACTIVE", "INACTIVE"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["ACTIVE", "INACTIVE"], { message: "状态必须是 ACTIVE 或 INACTIVE" })
  status?: "ACTIVE" | "INACTIVE";

  @ApiPropertyOptional({ description: "角色ID" })
  @IsOptional()
  @IsString()
  roleId?: string;
}
