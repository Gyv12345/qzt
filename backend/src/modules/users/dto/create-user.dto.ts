import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsInt, Min, IsArray } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: '用户名', example: 'zhangsan' })
  @IsString()
  username: string;

  @ApiProperty({ description: '密码', example: 'password123' })
  @IsString()
  password: string;

  @ApiProperty({ description: '姓名', example: '张三' })
  @IsString()
  name: string;

  @ApiProperty({ description: '邮箱', example: 'zhangsan@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '手机号', example: '13800138000', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: '部门ID', required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ description: '角色ID列表', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];

  @ApiProperty({ description: '状态: 1启用 0禁用', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  status?: number;
}
