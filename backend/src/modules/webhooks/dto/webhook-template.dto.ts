import { ApiProperty, PartialType } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsObject,
  MaxLength,
} from "class-validator";

export class CreateWebhookTemplateDto {
  @ApiProperty({ description: "模板名称", example: "新客户通知" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: "模板代码", example: "new_customer_notify" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({
    description: "平台",
    enum: ["wecom", "feishu", "dingtalk", "all"],
    example: "all",
  })
  @IsEnum(["wecom", "feishu", "dingtalk", "all"])
  platform: "wecom" | "feishu" | "dingtalk" | "all";

  @ApiProperty({
    description: "消息类型",
    enum: ["text", "markdown", "card"],
    example: "markdown",
  })
  @IsEnum(["text", "markdown", "card"])
  messageType: "text" | "markdown" | "card";

  @ApiProperty({
    description: "模板内容",
    example:
      "## 新客户通知\n\n客户名称：{{customerName}}\n联系电话：{{phone}}\n创建时间：{{createdAt}}",
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({
    description: "变量定义",
    example: {
      customerName: { type: "string", description: "客户名称" },
      phone: { type: "string", description: "联系电话" },
      createdAt: { type: "datetime", description: "创建时间" },
    },
    required: false,
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;

  @ApiProperty({ description: "描述", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ description: "是否启用", default: true, required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateWebhookTemplateDto extends PartialType(
  CreateWebhookTemplateDto,
) {}

export class SendTemplateDto {
  @ApiProperty({ description: "模板代码", example: "new_customer_notify" })
  @IsString()
  @IsNotEmpty()
  templateCode: string;

  @ApiProperty({
    description: "配置ID列表（可选，不填则发送到所有启用的配置）",
    required: false,
  })
  @IsOptional()
  @IsString({ each: true })
  configIds?: string[];

  @ApiProperty({
    description: "变量值",
    example: { customerName: "张三", phone: "13800138000" },
  })
  @IsObject()
  variables: Record<string, any>;
}

export class PreviewTemplateDto {
  @ApiProperty({ description: "模板代码", example: "new_customer_notify" })
  @IsString()
  @IsNotEmpty()
  templateCode: string;

  @ApiProperty({
    description: "变量值（可选）",
    example: { customerName: "张三" },
    required: false,
  })
  @IsOptional()
  @IsObject()
  variables?: Record<string, any>;
}
