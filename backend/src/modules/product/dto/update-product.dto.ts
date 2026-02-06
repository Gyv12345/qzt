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

  @ApiPropertyOptional({ description: "价格", example: 5000 })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: "价格必须大于等于0" })
  price?: number;

  @ApiPropertyOptional({ description: "开票额度(月)", example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: "开票额度必须大于等于0" })
  invoiceLimit?: number;

  @ApiPropertyOptional({ description: "套餐包含开票张数(月)", example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: "开票张数必须大于等于0" })
  invoiceCount?: number;

  @ApiPropertyOptional({ description: "超额单价", example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: "超额单价必须大于等于0" })
  overLimitPrice?: number;
}
