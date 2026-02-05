import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySystemLogDto {
  @ApiProperty({ description: '页码', example: 1, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', example: 10, required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @ApiProperty({ description: '日志级别: INFO, WARN, ERROR, DEBUG', required: false })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiProperty({ description: '模块名', required: false })
  @IsOptional()
  @IsString()
  module?: string;

  @ApiProperty({ description: '开始时间 (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ description: '结束时间 (YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  endDate?: string;
}
