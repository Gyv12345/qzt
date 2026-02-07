import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  IsIn,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * 查询 CMS 内容 DTO
 */
export class QueryCmsContentDto {
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
    description: "内容类型",
    enum: ["ARTICLE", "CASE_STUDY", "PRODUCT_SHOWCASE", "PROFILE"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["ARTICLE", "CASE_STUDY", "PRODUCT_SHOWCASE", "PROFILE"])
  contentType?: "ARTICLE" | "CASE_STUDY" | "PRODUCT_SHOWCASE" | "PROFILE";

  @ApiPropertyOptional({
    description: "状态",
    enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["DRAFT", "PUBLISHED", "ARCHIVED"])
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";

  @ApiPropertyOptional({ description: "标签ID筛选" })
  @IsOptional()
  @IsString()
  tagId?: string;

  @ApiPropertyOptional({ description: "作者ID筛选" })
  @IsOptional()
  @IsString()
  authorId?: string;
}
