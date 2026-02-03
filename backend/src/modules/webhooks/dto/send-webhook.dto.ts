import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class SendWebhookDto {
  @ApiProperty({ description: 'Webhook 配置 ID', example: 'clxxxx' })
  @IsString()
  configId: string;

  @ApiProperty({
    description: '消息类型',
    enum: ['text', 'markdown', 'card'],
    example: 'text'
  })
  @IsEnum(['text', 'markdown', 'card'])
  messageType: 'text' | 'markdown' | 'card';

  @ApiProperty({
    description: '消息内容',
    example: { content: '测试消息' }
  })
  @IsObject()
  content: Record<string, any>;
}
