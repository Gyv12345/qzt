import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsInt, Min, IsIn } from "class-validator";
import { Type } from "class-transformer";
// 类型定义参考 @qzt/shared-types/dist/product/schemas

/**
 * 查询产品 DTO
 *
 * 类型对应 shared-types 中的 QueryProductParams
 */
export class QueryProductDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: "每页数量", default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({ description: "搜索关键词" })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({
    description: "状态",
    enum: ["ACTIVE", "INACTIVE"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["ACTIVE", "INACTIVE"], { message: "状态必须是 ACTIVE 或 INACTIVE" })
  status?: "ACTIVE" | "INACTIVE";
}
