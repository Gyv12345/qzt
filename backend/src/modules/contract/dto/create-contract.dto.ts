import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateContractDto {
  @ApiProperty({ description: '客户ID', example: 'cuid123' })
  @IsString()
  customerId: string;

  @ApiProperty({ description: '产品ID', example: 'cuid456' })
  @IsString()
  productId: string;

  @ApiProperty({ description: '合同金额', example: 10000 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ description: '服务开始日期', example: '2024-01-01' })
  @IsDateString()
  serviceStart: string;

  @ApiProperty({ description: '服务结束日期', example: '2024-12-31' })
  @IsDateString()
  serviceEnd: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
