import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsInt, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSocialMediaAccountDto {
  @ApiProperty({ description: '平台: douyin, xiaohongshu, wechat', example: 'douyin' })
  @IsString()
  @IsNotEmpty()
  @IsIn(['douyin', 'xiaohongshu', 'wechat'])
  platform: string;

  @ApiProperty({ description: '账号名称', example: '企业官方账号' })
  @IsString()
  @IsNotEmpty()
  accountName: string;

  @ApiPropertyOptional({ description: '应用ID' })
  @IsString()
  @IsOptional()
  appId?: string;

  @ApiPropertyOptional({ description: '应用密钥' })
  @IsString()
  @IsOptional()
  appSecret?: string;

  @ApiPropertyOptional({ description: '访问令牌' })
  @IsString()
  @IsOptional()
  accessToken?: string;

  @ApiPropertyOptional({ description: '刷新令牌' })
  @IsString()
  @IsOptional()
  refreshToken?: string;

  @ApiPropertyOptional({ description: '平台账号ID' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ description: '开放ID' })
  @IsString()
  @IsOptional()
  openId?: string;

  @ApiPropertyOptional({ description: '联合ID' })
  @IsString()
  @IsOptional()
  unionId?: string;

  @ApiPropertyOptional({ description: '令牌过期时间（ISO 8601格式）' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdateSocialMediaAccountDto {
  @ApiPropertyOptional({ description: '账号名称' })
  @IsString()
  @IsOptional()
  accountName?: string;

  @ApiPropertyOptional({ description: '应用ID' })
  @IsString()
  @IsOptional()
  appId?: string;

  @ApiPropertyOptional({ description: '应用密钥' })
  @IsString()
  @IsOptional()
  appSecret?: string;

  @ApiPropertyOptional({ description: '访问令牌' })
  @IsString()
  @IsOptional()
  accessToken?: string;

  @ApiPropertyOptional({ description: '刷新令牌' })
  @IsString()
  @IsOptional()
  refreshToken?: string;

  @ApiPropertyOptional({ description: '状态: 1:启用 0:禁用', example: 1 })
  @IsInt()
  @IsOptional()
  @IsIn([0, 1])
  status?: number;

  @ApiPropertyOptional({ description: '令牌过期时间（ISO 8601格式）' })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class QuerySocialMediaAccountDto {
  @ApiPropertyOptional({ description: '平台' })
  @IsString()
  @IsOptional()
  platform?: string;

  @ApiPropertyOptional({ description: '状态', example: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  status?: number;

  @ApiPropertyOptional({ description: '页码', example: 1, default: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: '每页数量', example: 10, default: 10 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 10;
}

export class RefreshTokenDto {
  @ApiProperty({ description: '账号ID' })
  @IsString()
  @IsNotEmpty()
  id: string;
}
