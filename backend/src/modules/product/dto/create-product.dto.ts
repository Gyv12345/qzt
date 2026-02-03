import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ description: '产品名称', example: '财税基础套餐' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '产品代码', example: 'FIN_BASE_001' })
  @IsString()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: '产品描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '价格', example: 5000 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({ description: '开票额度(月)', example: 10 })
  @IsNumber()
  @Min(0)
  invoiceLimit: number;

  @ApiProperty({ description: '套餐包含开票张数(月)', example: 50 })
  @IsNumber()
  @Min(0)
  invoiceCount: number;

  @ApiProperty({ description: '超额单价', example: 20 })
  @IsNumber()
  @Min(0)
  overLimitPrice: number;
}
