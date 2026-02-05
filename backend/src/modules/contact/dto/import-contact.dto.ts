import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ImportContactRowDto {
  @ApiProperty({ description: '联系人姓名' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '联系电话' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: '联系邮箱', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ description: '微信号', required: false })
  @IsOptional()
  @IsString()
  wechat?: string;

  @ApiProperty({ description: '职位', required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ description: '部门', required: false })
  @IsOptional()
  @IsString()
  department?: string;
}

export class ImportContactDto {
  @ApiProperty({ type: [ImportContactRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportContactRowDto)
  rows: ImportContactRowDto[];
}
