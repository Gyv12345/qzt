import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsArray,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  MaxLength,
  ArrayNotEmpty,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * 合同产品明细 DTO
 */
export class ContractItemDto {
  @ApiProperty({ description: "产品ID", example: "cuid456" })
  @IsString()
  productId: string;

  @ApiProperty({ description: "数量", example: 1, minimum: 1 })
  @IsNumber()
  @Min(1, { message: "数量必须大于0" })
  quantity: number;

  @ApiProperty({ description: "产品原价（划线价格）", example: 10000 })
  @IsNumber()
  @Min(0, { message: "原价必须大于等于0" })
  originalPrice: number;

  @ApiProperty({ description: "实际成交价", example: 9000 })
  @IsNumber()
  @Min(0, { message: "实际价格必须大于等于0" })
  actualPrice: number;
}

/**
 * 创建合同 DTO
 *
 * 从 @qzt/shared-types 继承类型，确保前后端类型一致
 */
export class CreateContractDto {
  @ApiProperty({ description: "客户ID", example: "cuid123" })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: "合同产品列表",
    type: [ContractItemDto],
    required: true,
  })
  @IsArray()
  @ArrayNotEmpty({ message: "请至少添加一个产品" })
  @ValidateNested({ each: true })
  @Type(() => ContractItemDto)
  items: ContractItemDto[];

  @ApiProperty({ description: "合同模板ID", required: false })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiProperty({ description: "服务开始日期", example: "2024-01-01" })
  @IsDateString()
  serviceStart: string;

  @ApiProperty({ description: "服务结束日期", example: "2024-12-31" })
  @IsDateString()
  serviceEnd: string;

  @ApiProperty({ description: "备注", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "备注最多500个字符" })
  remark?: string;
}
