import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsIn, IsOptional, IsString } from 'class-validator';

export class ExportContactDto {
  @ApiProperty({ description: '导出范围', enum: ['all', 'filtered', 'selected'] })
  @IsIn(['all', 'filtered', 'selected'])
  range: 'all' | 'filtered' | 'selected';

  @ApiProperty({ description: '导出字段' })
  @IsArray()
  columns: string[];

  @ApiProperty({ description: '选中行 ID', required: false })
  @IsOptional()
  @IsArray()
  ids?: string[];

  @ApiProperty({ description: '关键词筛选', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '公司筛选', required: false })
  @IsOptional()
  @IsString()
  customerId?: string;
}
