import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

export class QueryContactDto {
  @ApiProperty({ description: '页码', default: 1, required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  page?: number = 1;

  @ApiProperty({ description: '每页数量', default: 10, required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  pageSize?: number = 10;

  @ApiProperty({ description: '搜索关键词', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '公司ID筛选', required: false })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiProperty({ description: '排序字段', default: 'createdAt', required: false })
  @IsOptional()
  @IsString()
  sortField?: string = 'createdAt';

  @ApiProperty({ description: '排序方向', default: 'desc', required: false })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
