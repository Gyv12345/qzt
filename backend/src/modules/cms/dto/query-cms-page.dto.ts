import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

/**
 * 查询 CMS 页面 DTO
 */
export class QueryCmsPageDto {
  @ApiPropertyOptional({ description: "页码", default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "每页数量", default: 10, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @ApiPropertyOptional({ description: "搜索关键词" })
  @IsOptional()
  keyword?: string;

  @ApiPropertyOptional({ description: "状态" })
  @IsOptional()
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}
