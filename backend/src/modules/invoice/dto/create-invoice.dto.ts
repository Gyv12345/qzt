import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, IsDateString } from 'class-validator';

export class CreateInvoiceDto {
  @ApiProperty({ description: '客户ID', example: 'cuid123' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: '合同ID(可选)', example: 'cuid456', required: false })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiProperty({ description: '开票金额', example: 10000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: '开票张数', example: 50 })
  @IsNumber()
  @Min(1)
  count: number;

  @ApiProperty({ description: '开票月份(YYYY-MM)', example: '2024-01' })
  @IsString()
  month: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
