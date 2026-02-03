import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TestWebhookDto {
  @ApiProperty({ description: 'Webhook URL', example: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx' })
  @IsString()
  webhookUrl: string;

  @ApiProperty({
    description: '平台',
    enum: ['wecom', 'feishu', 'dingtalk'],
    example: 'wecom'
  })
  platform: 'wecom' | 'feishu' | 'dingtalk';
}
