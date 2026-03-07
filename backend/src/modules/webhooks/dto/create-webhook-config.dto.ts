import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsEnum, IsOptional } from "class-validator";

export class CreateWebhookConfigDto {
  @ApiProperty({ description: "配置名称", example: "企业微信通知" })
  @IsString()
  name: string;

  @ApiProperty({
    description: "平台",
    enum: ["wecom", "feishu", "dingtalk"],
    example: "wecom",
  })
  @IsEnum(["wecom", "feishu", "dingtalk"])
  platform: "wecom" | "feishu" | "dingtalk";

  @ApiProperty({
    description: "Webhook URL",
    example: "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx",
  })
  @IsString()
  webhookUrl: string;

  @ApiProperty({ description: "是否启用", example: true, required: false })
  @IsOptional()
  enabled?: boolean;
}
