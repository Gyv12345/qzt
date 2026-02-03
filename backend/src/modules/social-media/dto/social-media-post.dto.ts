import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn, IsArray, IsDateString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateSocialMediaPostDto {
  @ApiProperty({ description: '账号ID' })
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @ApiProperty({ description: '标题', example: '产品介绍视频' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: '文案内容' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: '视频文件ID' })
  @IsString()
  @IsOptional()
  videoFileId?: string;

  @ApiPropertyOptional({ description: '封面图文件ID' })
  @IsString()
  @IsOptional()
  coverFileId?: string;

  @ApiPropertyOptional({ description: '视频URL（直接提供）' })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({ description: '封面图URL（直接提供）' })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiPropertyOptional({ description: '话题标签', type: [String], example: ['产品介绍', '新品发布'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  topics?: string[];

  @ApiPropertyOptional({ description: '位置信息' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: '可见性', enum: ['public', 'friends', 'private'], default: 'public' })
  @IsString()
  @IsOptional()
  @IsIn(['public', 'friends', 'private'])
  visibility?: string;

  @ApiPropertyOptional({ description: '定时发布时间（ISO 8601格式）' })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;
}

export class UpdateSocialMediaPostDto {
  @ApiPropertyOptional({ description: '标题' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ description: '文案内容' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ description: '视频文件ID' })
  @IsString()
  @IsOptional()
  videoFileId?: string;

  @ApiPropertyOptional({ description: '封面图文件ID' })
  @IsString()
  @IsOptional()
  coverFileId?: string;

  @ApiPropertyOptional({ description: '视频URL' })
  @IsString()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({ description: '封面图URL' })
  @IsString()
  @IsOptional()
  coverUrl?: string;

  @ApiPropertyOptional({ description: '话题标签', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  topics?: string[];

  @ApiPropertyOptional({ description: '位置信息' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: '可见性' })
  @IsString()
  @IsOptional()
  @IsIn(['public', 'friends', 'private'])
  visibility?: string;

  @ApiPropertyOptional({ description: '定时发布时间' })
  @IsDateString()
  @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional({ description: '状态', enum: ['draft', 'scheduled', 'publishing', 'published', 'failed'] })
  @IsString()
  @IsOptional()
  @IsIn(['draft', 'scheduled', 'publishing', 'published', 'failed'])
  status?: string;
}

export class QuerySocialMediaPostDto {
  @ApiPropertyOptional({ description: '账号ID' })
  @IsString()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({ description: '状态' })
  @IsString()
  @IsOptional()
  status?: string;

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

export class PublishSocialMediaPostDto {
  @ApiProperty({ description: '内容ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiPropertyOptional({ description: '目标平台', type: [String], example: ['douyin', 'xiaohongshu'] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  platforms?: string[];
}

export class SchedulePublishDto {
  @ApiProperty({ description: '内容ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: '定时发布时间（ISO 8601格式）' })
  @IsDateString()
  @IsNotEmpty()
  scheduledAt: string;
}

export class BatchPublishDto {
  @ApiProperty({ description: '内容ID列表', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  ids: string[];

  @ApiPropertyOptional({ description: '目标平台', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  platforms?: string[];
}
