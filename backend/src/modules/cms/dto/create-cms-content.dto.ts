import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  MaxLength,
  MinLength,
} from "class-validator";

/**
 * 创建 CMS 内容 DTO
 */
export class CreateCmsContentDto {
  @ApiProperty({ description: "标题", example: "公司动态：新产品发布" })
  @IsString()
  @MinLength(1, { message: "标题不能为空" })
  @MaxLength(200, { message: "标题最多200个字符" })
  title: string;

  @ApiProperty({ description: "URL别名", example: "new-product-launch" })
  @IsString()
  @MinLength(1, { message: "URL别名不能为空" })
  slug: string;

  @ApiProperty({ description: "内容", example: "<p>详细内容...</p>" })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: "摘要", example: "新产品发布的简要介绍" })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "摘要最多500个字符" })
  excerpt?: string;

  @ApiPropertyOptional({ description: "封面图URL" })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @ApiPropertyOptional({
    description: "状态",
    enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
    default: "DRAFT",
  })
  @IsOptional()
  @IsEnum(["DRAFT", "PUBLISHED", "ARCHIVED"], {
    message: "状态必须是 DRAFT、PUBLISHED 或 ARCHIVED",
  })
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";

  @ApiProperty({
    description: "内容类型",
    enum: [
      "ARTICLE",
      "CASE_STUDY",
      "PRODUCT_SHOWCASE",
      "PROFILE",
      "PAGE_ELEMENT",
    ],
  })
  @IsEnum(
    ["ARTICLE", "CASE_STUDY", "PRODUCT_SHOWCASE", "PROFILE", "PAGE_ELEMENT"],
    {
      message:
        "内容类型必须是 ARTICLE、CASE_STUDY、PRODUCT_SHOWCASE、PROFILE 或 PAGE_ELEMENT",
    },
  )
  contentType:
    | "ARTICLE"
    | "CASE_STUDY"
    | "PRODUCT_SHOWCASE"
    | "PROFILE"
    | "PAGE_ELEMENT";

  @ApiPropertyOptional({
    description: "关联产品ID（仅PRODUCT_SHOWCASE类型使用）",
  })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: "关联用户ID（仅PROFILE类型使用）" })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: "关联合同ID（仅CASE_STUDY类型使用，展示客户案例）",
  })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiPropertyOptional({ description: "SEO标题" })
  @IsOptional()
  @IsString()
  @MaxLength(60, { message: "SEO标题最多60个字符" })
  metaTitle?: string;

  @ApiPropertyOptional({ description: "SEO描述" })
  @IsOptional()
  @IsString()
  @MaxLength(160, { message: "SEO描述最多160个字符" })
  metaDesc?: string;

  @ApiPropertyOptional({ description: "关键词" })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiPropertyOptional({ description: "标签ID数组", example: ["tag1", "tag2"] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tagIds?: string[];
}
