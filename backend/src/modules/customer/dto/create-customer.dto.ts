import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, MinLength, MaxLength, IsDateString } from 'class-validator';

export class CreateCustomerDto {
  @ApiProperty({ description: '公司名称', example: 'XX科技有限公司' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: '公司简称', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  shortName?: string;

  @ApiProperty({ description: '公司编码', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  code?: string;

  @ApiProperty({ description: '行业', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  industry?: string;

  @ApiProperty({ description: '公司规模', required: false, example: '11-50人' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  scale?: string;

  @ApiProperty({ description: '公司地址', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiProperty({ description: '公司网站', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  @ApiProperty({ description: '客户等级: 0:线索公司 1:意向客户 2:正式客户 3:VIP客户', default: 0 })
  @IsOptional()
  @IsInt()
  customerLevel?: number;

  @ApiProperty({ description: '来源渠道', required: false })
  @IsOptional()
  @IsString()
  sourceChannel?: string;

  @ApiProperty({ description: '跟进人ID', required: false })
  @IsOptional()
  @IsString()
  followUserId?: string;

  @ApiProperty({ description: '首次联系时间', required: false })
  @IsOptional()
  @IsDateString()
  firstContactDate?: string;

  @ApiProperty({ description: '签约时间', required: false })
  @IsOptional()
  @IsDateString()
  contractDate?: string;

  @ApiProperty({ description: '标签(JSON数组)', required: false })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({ description: '备注', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remark?: string;
}
