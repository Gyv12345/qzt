import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, IsIn } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ description: '部门名称', example: '技术部' })
  @IsString()
  name: string;

  @ApiProperty({ description: '父部门ID', required: false })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiProperty({ description: '排序', example: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort?: number;

  @ApiProperty({ description: '状态: ACTIVE启用 INACTIVE禁用', example: 'ACTIVE', required: false })
  @IsOptional()
  @IsString()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: string;
}
