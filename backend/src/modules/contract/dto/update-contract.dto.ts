import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsArray,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ContractItemDto } from "./create-contract.dto";

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

  @ApiPropertyOptional({
    description: "合同产品列表（完整替换）",
    type: [ContractItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ContractItemDto)
  items?: ContractItemDto[];

  @ApiPropertyOptional({ description: "合同模板ID" })
  @IsOptional()
  @IsString()
  templateId?: string;

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
