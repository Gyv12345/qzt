import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsEmail, MinLength, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ description: '客户名称', example: 'XX科技' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: '联系人姓名', example: '张三' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  contactName: string;

  @ApiProperty({ description: '联系电话', example: '13800138000' })
  @IsString()
  @MinLength(11)
  @MaxLength(11)
  contactPhone: string;

  @ApiProperty({ description: '联系邮箱', required: false })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ description: '公司名称', required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ description: '地址', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: '客户等级: 0:潜在 1:意向 2:正式 3:VIP', default: 0 })
  @IsOptional()
  @IsInt()
  customerLevel?: number;

  @ApiProperty({ description: '来源渠道', required: false })
  @IsOptional()
  @IsInt()
  sourceChannel?: number;

  @ApiProperty({ description: '跟进人ID', required: false })
  @IsOptional()
  @IsString()
  followUserId?: string;

  @ApiProperty({ description: '标签(JSON数组)', required: false })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}
