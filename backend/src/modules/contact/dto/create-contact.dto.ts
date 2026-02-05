import { ApiProperty } from '@nestjs/swagger'
import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  IsDateString,
} from 'class-validator'
import type { ContactBase } from '@qzt/shared-types/dist/contact/schemas'

/**
 * 创建联系人 DTO
 *
 * 从 @qzt/shared-types 继承类型，确保前后端类型一致
 */
export class CreateContactDto {
  @ApiProperty({ description: '联系人姓名', example: '张三' })
  @IsString()
  @MinLength(1, { message: '联系人姓名不能为空' })
  @MaxLength(50, { message: '姓名最多50个字符' })
  name: string

  @ApiProperty({ description: '联系电话', example: '13800138000' })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号格式不正确' })
  phone: string

  @ApiProperty({ description: '联系邮箱', required: false })
  @IsOptional()
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email?: string

  @ApiProperty({ description: '微信号', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '微信号最多50个字符' })
  wechat?: string

  @ApiProperty({ description: '职位', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '职位最多50个字符' })
  position?: string

  @ApiProperty({ description: '部门', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50, { message: '部门最多50个字符' })
  department?: string

  @ApiProperty({ description: '生日', required: false })
  @IsOptional()
  @IsDateString()
  birthdate?: string

  @ApiProperty({ description: '标签(JSON数组)', required: false })
  @IsOptional()
  @IsString()
  tags?: string

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: '备注最多500个字符' })
  remark?: string
}
