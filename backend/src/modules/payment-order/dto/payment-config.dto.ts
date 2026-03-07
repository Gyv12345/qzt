import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsIn,
} from "class-validator";

export class CreatePaymentConfigDto {
  @ApiProperty({ description: "支付方式: wechat, alipay", example: "wechat" })
  @IsString()
  @IsNotEmpty()
  @IsIn(["wechat", "alipay"])
  paymentMethod: string;

  @ApiProperty({ description: "支付渠道", example: "wechat_pay" })
  @IsString()
  @IsNotEmpty()
  paymentChannel: string;

  @ApiPropertyOptional({ description: "应用ID" })
  @IsString()
  @IsOptional()
  appId?: string;

  @ApiPropertyOptional({ description: "应用密钥" })
  @IsString()
  @IsOptional()
  appSecret?: string;

  @ApiPropertyOptional({ description: "商户ID" })
  @IsString()
  @IsOptional()
  merchantId?: string;

  @ApiPropertyOptional({ description: "API密钥" })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ description: "证书路径" })
  @IsString()
  @IsOptional()
  certPath?: string;

  @ApiPropertyOptional({ description: "默认回调地址" })
  @IsString()
  @IsOptional()
  notifyUrl?: string;

  @ApiPropertyOptional({ description: "默认返回地址" })
  @IsString()
  @IsOptional()
  returnUrl?: string;

  @ApiPropertyOptional({ description: "是否沙箱环境", default: false })
  @IsBoolean()
  @IsOptional()
  sandbox?: boolean = false;
}

export class UpdatePaymentConfigDto {
  @ApiPropertyOptional({ description: "应用密钥" })
  @IsString()
  @IsOptional()
  appSecret?: string;

  @ApiPropertyOptional({ description: "API密钥" })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional({ description: "证书路径" })
  @IsString()
  @IsOptional()
  certPath?: string;

  @ApiPropertyOptional({ description: "默认回调地址" })
  @IsString()
  @IsOptional()
  notifyUrl?: string;

  @ApiPropertyOptional({ description: "默认返回地址" })
  @IsString()
  @IsOptional()
  returnUrl?: string;

  @ApiPropertyOptional({ description: "是否沙箱环境" })
  @IsBoolean()
  @IsOptional()
  sandbox?: boolean;

  @ApiPropertyOptional({ description: "状态 0:禁用 1:启用" })
  @IsString()
  @IsOptional()
  @IsIn(["0", "1", 0, 1])
  status?: number;
}

export class QueryPaymentConfigDto {
  @ApiPropertyOptional({ description: "支付方式" })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional({ description: "支付渠道" })
  @IsString()
  @IsOptional()
  paymentChannel?: string;
}
