import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  MaxLength,
  Matches,
} from "class-validator";
import type { InvoiceBase } from "@qzt/shared-types/dist/invoice/schemas";

/**
 * 创建发票 DTO
 *
 * 从 @qzt/shared-types 继承类型，确保前后端类型一致
 */
export class CreateInvoiceDto implements InvoiceBase {
  @ApiProperty({ description: "客户ID", example: "cuid123" })
  @IsString()
  customerId: string;

  @ApiProperty({
    description: "合同ID(可选)",
    example: "cuid456",
    required: false,
  })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiProperty({ description: "开票金额", example: 10000 })
  @IsNumber()
  @Min(0, { message: "开票金额必须大于等于0" })
  amount: number;

  @ApiProperty({ description: "开票张数", example: 50 })
  @IsNumber()
  @Min(1, { message: "开票张数必须大于等于1" })
  count: number;

  @ApiProperty({ description: "开票月份(YYYY-MM)", example: "2024-01" })
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: "开票月份格式必须为 YYYY-MM" })
  month: string;

  @ApiProperty({ description: "备注", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: "备注最多500个字符" })
  remark?: string;
}
