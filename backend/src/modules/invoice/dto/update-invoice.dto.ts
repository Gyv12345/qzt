import { ApiPropertyOptional } from '@nestjs/swagger'
import { IsString, IsNumber, IsOptional, Min, MaxLength, Matches } from 'class-validator'

/**
 * 更新发票 DTO
 *
 * 从 @qzt/shared-types 继承类型，确保前后端类型一致
 * 所有字段都是可选的
 */
export class UpdateInvoiceDto {
  @ApiPropertyOptional({ description: '客户ID', example: 'cuid123' })
  @IsOptional()
  @IsString()
  customerId?: string

  @ApiPropertyOptional({ description: '合同ID(可选)', example: 'cuid456' })
  @IsOptional()
  @IsString()
  contractId?: string

  @ApiPropertyOptional({ description: '开票金额', example: 10000 })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: '开票金额必须大于等于0' })
  amount?: number

  @ApiPropertyOptional({ description: '开票张数', example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1, { message: '开票张数必须大于等于1' })
  count?: number

  @ApiPropertyOptional({ description: '开票月份(YYYY-MM)', example: '2024-01' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/, { message: '开票月份格式必须为 YYYY-MM' })
  month?: string

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '备注最多500个字符' })
  remark?: string
}
