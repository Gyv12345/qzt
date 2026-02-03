import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsEmail, Matches } from 'class-validator';

/**
 * 为公司添加联系人（如果联系人不存在则创建）
 */
export class AddContactDto {
  @ApiProperty({ description: '联系人姓名', example: '张三' })
  @IsString()
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
  wechat?: string;

  @ApiProperty({ description: '是否主要联系人', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiProperty({ description: '是否决策人', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  isDecision?: boolean;

  @ApiProperty({ description: '在该公司的部门', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: '在该公司的职位', required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ description: '与公司关系（法人/股东/采购负责人/财务等）', required: false })
  @IsOptional()
  @IsString()
  relation?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * 关联已有联系人
 */
export class LinkContactDto {
  @ApiProperty({ description: '联系人ID', example: 'clx123456' })
  @IsString()
  contactId: string;

  @ApiProperty({ description: '是否主要联系人', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiProperty({ description: '是否决策人', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  isDecision?: boolean;

  @ApiProperty({ description: '在该公司的部门', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: '在该公司的职位', required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ description: '与公司关系', required: false })
  @IsOptional()
  @IsString()
  relation?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

/**
 * 更新联系人角色
 */
export class UpdateContactRoleDto {
  @ApiProperty({ description: '是否主要联系人', required: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiProperty({ description: '是否决策人', required: false })
  @IsOptional()
  @IsBoolean()
  isDecision?: boolean;

  @ApiProperty({ description: '部门', required: false })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiProperty({ description: '职位', required: false })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiProperty({ description: '与公司关系', required: false })
  @IsOptional()
  @IsString()
  relation?: string;

  @ApiProperty({ description: '状态: 1在职 0离职', required: false })
  @IsOptional()
  status?: number;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
