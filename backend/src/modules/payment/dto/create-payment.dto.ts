import { ApiProperty } from '@nestjs/swagger'
import { IsString, IsNumber, IsDateString, IsOptional, Min, MaxLength, IsIn } from 'class-validator'

// 类型定义参考 @qzt/shared-types/dist/payment/schemas

/**
 * 创建收款记录 DTO
 *
 * 类型对应 shared-types 中的 Omit<PaymentBase, 'voucherUrl'>
 */
export class CreatePaymentDto {
  @ApiProperty({ description: '合同ID', example: 'cuid123' })
  @IsString()
  contractId: string

  @ApiProperty({ description: '收款金额', example: 5000 })
  @IsNumber()
  @Min(0, { message: '收款金额必须大于等于0' })
  amount: number

  @ApiProperty({
    description: '收款方式',
    enum: ['BANK_TRANSFER', 'WECHAT', 'ALIPAY', 'CASH'],
    example: 'BANK_TRANSFER',
  })
  @IsString()
  @IsIn(['BANK_TRANSFER', 'WECHAT', 'ALIPAY', 'CASH'], {
    message: '收款方式必须是 BANK_TRANSFER、WECHAT、ALIPAY 或 CASH',
  })
  method: 'BANK_TRANSFER' | 'WECHAT' | 'ALIPAY' | 'CASH'

  @ApiProperty({ description: '凭证URL', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '凭证URL最多500个字符' })
  voucherUrl?: string

  @ApiProperty({ description: '付款时间', required: false })
  @IsOptional()
  @IsDateString()
  payTime?: string

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '备注最多500个字符' })
  remark?: string
}
