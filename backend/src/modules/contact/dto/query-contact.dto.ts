import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsIn } from "class-validator";
import { Transform } from "class-transformer";

// 类型定义参考 @qzt/shared-types/dist/contact/schemas

/**
 * 查询联系人 DTO
 *
 * 类型对应 shared-types 中的 QueryContactParams
 */
export class QueryContactDto {
  @ApiPropertyOptional({ description: "页码", default: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", default: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: "搜索关键词" })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: "公司ID筛选" })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: "排序字段", default: "createdAt" })
  @IsOptional()
  @IsString()
  sortField?: string = "createdAt";

  @ApiPropertyOptional({ description: "排序方向", default: "desc" })
  @IsOptional()
  @IsString()
  @IsIn(["asc", "desc"], { message: "排序方向必须是 asc 或 desc" })
  sortOrder?: "asc" | "desc" = "desc";
}
