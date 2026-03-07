import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  MaxLength,
  MinLength,
  IsBoolean,
  IsInt,
} from "class-validator";

/**
 * 创建页面元素 DTO
 */
export class CreatePageElementDto {
  @ApiProperty({ description: "区域类型" })
  @IsEnum(
    ["HERO", "STATS", "FEATURES", "CTA", "TESTIMONIALS", "PARTNERS", "CONTACT"],
    {
      message:
        "区域类型必须是 HERO, STATS, FEATURES, CTA, TESTIMONIALS, PARTNERS 或 CONTACT",
    },
  )
  sectionType:
    | "HERO"
    | "STATS"
    | "FEATURES"
    | "CTA"
    | "TESTIMONIALS"
    | "PARTNERS"
    | "CONTACT";

  @ApiProperty({ description: "元素类型" })
  @IsEnum(
    [
      "heading",
      "text",
      "button",
      "image",
      "card",
      "list",
      "statistic",
      "testimonial",
    ],
    {
      message:
        "元素类型必须是 heading, text, button, image, card, list, statistic 或 testimonial",
    },
  )
  elementType:
    | "heading"
    | "text"
    | "button"
    | "image"
    | "card"
    | "list"
    | "statistic"
    | "testimonial";

  @ApiPropertyOptional({ description: "排序", default: 0 })
  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @ApiPropertyOptional({ description: "元素内容（JSON格式）" })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: "样式配置（JSON格式）" })
  @IsOptional()
  @IsString()
  styleConfig?: string;

  @ApiPropertyOptional({ description: "是否显示", default: true })
  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

/**
 * 创建 CMS 页面 DTO
 */
export class CreateCmsPageDto {
  @ApiProperty({ description: "页面名称（内部标识）", example: "homepage" })
  @IsString()
  @MinLength(1, { message: "页面名称不能为空" })
  @MaxLength(100, { message: "页面名称最多100个字符" })
  name: string;

  @ApiProperty({ description: "页面标题", example: "首页" })
  @IsString()
  @MinLength(1, { message: "页面标题不能为空" })
  @MaxLength(200, { message: "页面标题最多200个字符" })
  title: string;

  @ApiProperty({ description: "URL路径", example: "homepage" })
  @IsString()
  @MinLength(1, { message: "URL路径不能为空" })
  slug: string;

  @ApiPropertyOptional({ description: "页面描述" })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "页面描述最多500个字符" })
  description?: string;

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

  // SEO 字段
  @ApiPropertyOptional({ description: "SEO 标题", maxLength: 60 })
  @IsOptional()
  @IsString()
  @MaxLength(60, { message: "SEO 标题最多60个字符" })
  metaTitle?: string;

  @ApiPropertyOptional({ description: "SEO 描述", maxLength: 160 })
  @IsOptional()
  @IsString()
  @MaxLength(160, { message: "SEO 描述最多160个字符" })
  metaDesc?: string;

  @ApiPropertyOptional({ description: "关键词" })
  @IsOptional()
  @IsString()
  keywords?: string;

  @ApiPropertyOptional({ description: "OG 图片 URL" })
  @IsOptional()
  @IsString()
  ogImage?: string;

  // 模板字段
  @ApiPropertyOptional({
    description: "页面模板",
    enum: ["homepage", "about", "contact", "custom"],
  })
  @IsOptional()
  @IsEnum(["homepage", "about", "contact", "custom"], {
    message: "模板必须是 homepage、about、contact 或 custom",
  })
  template?: "homepage" | "about" | "contact" | "custom";

  @ApiPropertyOptional({
    description: "页面元素",
    type: [CreatePageElementDto],
  })
  @IsOptional()
  @IsArray()
  elements?: CreatePageElementDto[];
}
