import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  Min,
  MaxLength,
  MinLength,
} from "class-validator";
import type { UpdateProductBase } from "@qzt/shared-types/dist/product/schemas";

/**
 * 更新产品 DTO
 *
 * 从 @qzt/shared-types 继承类型，确保前后端类型一致
 * 所有字段都是可选的
 */
export class UpdateProductDto implements UpdateProductBase {
  @ApiPropertyOptional({ description: "产品名称", example: "财税基础套餐" })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: "产品名称不能为空" })
  @MaxLength(100, { message: "产品名称最多100个字符" })
  name?: string;

  @ApiPropertyOptional({ description: "产品代码", example: "FIN_BASE_001" })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: "产品代码不能为空" })
  @MaxLength(50, { message: "产品代码最多50个字符" })
  code?: string;

  @ApiPropertyOptional({ description: "产品描述" })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "产品描述最多500个字符" })
  description?: string;

  @ApiPropertyOptional({ description: "基础价格", example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: "价格必须大于等于0" })
  price?: number;

  @ApiPropertyOptional({
    description: "产品时间轴(JSON数组)",
    example: '["签约后启动服务", "完成工商注册", "税务登记完成"]',
  })
  @IsOptional()
  @IsString()
  timeline?: string;

  @ApiPropertyOptional({
    description: "定价类型",
    example: "FIXED",
    enum: ["FIXED", "TIER_AMOUNT", "TIER_COUNT", "ZERO_DECLARATION"],
  })
  @IsOptional()
  @IsString()
  pricingType?: string;

  @ApiPropertyOptional({
    description: "服务负责人角色ID",
    example: "clxxxxxxx",
  })
  @IsOptional()
  @IsString()
  serviceRoleId?: string;

  @ApiPropertyOptional({ description: "产品图片ID" })
  @IsOptional()
  @IsString()
  imageId?: string;
}
