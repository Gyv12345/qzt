import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  MaxLength,
} from "class-validator";

/**
 * 更新合同 DTO
 *
 * 从 @qzt/shared-types 继承类型，确保前后端类型一致
 * 所有字段都是可选的
 */
export class UpdateContractDto {
  @ApiPropertyOptional({ description: "客户ID", example: "cuid123" })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ description: "产品ID", example: "cuid456" })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: "合同金额", example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: "合同金额必须大于等于0" })
  amount?: number;

  @ApiPropertyOptional({ description: "服务开始日期", example: "2024-01-01" })
  @IsOptional()
  @IsDateString()
  serviceStart?: string;

  @ApiPropertyOptional({ description: "服务结束日期", example: "2024-12-31" })
  @IsOptional()
  @IsDateString()
  serviceEnd?: string;

  @ApiPropertyOptional({ description: "备注" })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "备注最多500个字符" })
  remark?: string;
}
