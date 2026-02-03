import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional, IsEnum, Min } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ description: '合同ID', example: 'cuid123' })
  @IsString()
  contractId: string;

  @ApiProperty({ description: '收款金额', example: 5000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: '收款方式: 1:银行转账 2:微信 3:支付宝 4:现金', example: 1 })
  @IsNumber()
  @IsEnum([1, 2, 3, 4])
  method: number;

  @ApiProperty({ description: '凭证URL', required: false })
  @IsOptional()
  @IsString()
  voucherUrl?: string;

  @ApiProperty({ description: '付款时间', required: false })
  @IsOptional()
  @IsDateString()
  payTime?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
