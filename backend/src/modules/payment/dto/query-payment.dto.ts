import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPaymentDto {
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

  @ApiProperty({ description: '合同ID', required: false })
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiProperty({ description: '收款状态', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  status?: number;
}
