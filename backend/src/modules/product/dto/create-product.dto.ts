import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ description: '产品名称', example: '企账通基础版' })
  @IsString()
  name: string;

  @ApiProperty({ description: '产品代码', example: 'QZT-BASIC' })
  @IsString()
  code: string;

  @ApiProperty({ description: '产品描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '产品价格', example: 9800 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: '开票额度(月)', example: 50, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  invoiceLimit?: number;

  @ApiProperty({ description: '套餐包含开票张数(月)', example: 100, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  invoiceCount?: number;

  @ApiProperty({ description: '超额单价', example: 2, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  overLimitPrice?: number;

  @ApiProperty({ description: '状态', example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  status?: number;
}
