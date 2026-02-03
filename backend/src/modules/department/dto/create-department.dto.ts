import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min } from 'class-validator';

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

  @ApiProperty({ description: '状态: 1启用 0禁用', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  status?: number;
}
