import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryContractDto {
  @ApiProperty({ description: '页码', default: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1;

  @ApiProperty({ description: '每页数量', default: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number = 10;

  @ApiProperty({ description: '搜索关键词', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '客户ID', required: false })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ description: '产品ID', required: false })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty({ description: '合同状态', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}
