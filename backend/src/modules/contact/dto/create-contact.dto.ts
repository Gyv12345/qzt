import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEmail, MinLength, MaxLength, Matches, IsDateString } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({ description: '联系人姓名', example: '张三' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: '联系电话', example: '13800138000' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string;

  @ApiProperty({ description: '联系邮箱', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '微信号', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  wechat?: string;

  @ApiProperty({ description: '职位', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  position?: string;

  @ApiProperty({ description: '部门', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  department?: string;

  @ApiProperty({ description: '生日', required: false })
  @IsOptional()
  @IsDateString()
  birthdate?: string;

  @ApiProperty({ description: '标签(JSON数组)', required: false })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remark?: string;
}
