import { IsString, IsOptional, IsEnum } from "class-validator";

/**
 * 证书类型枚举
 */
export enum CertificateType {
  WECHAT_APICLIENT_CERT = "WECHAT_APICLIENT_CERT",
  WECHAT_PRIVATE_KEY = "WECHAT_PRIVATE_KEY",
  WECHAT_PUBLIC_KEY = "WECHAT_PUBLIC_KEY",
  WECHAT_API_KEY = "WECHAT_API_KEY",
  ALIPAY_PRIVATE_KEY = "ALIPAY_PRIVATE_KEY",
  ALIPAY_PUBLIC_KEY = "ALIPAY_PUBLIC_KEY",
}

/**
 * 证书配置DTO
 */
export class CertificateConfigDto {
  @IsString()
  paymentMethod: "wechat" | "alipay";

  @IsString()
  certificateType: CertificateType;

  @IsString()
  @IsOptional()
  certPath?: string;

  @IsString()
  @IsOptional()
  certContent?: string;

  @IsEnum(["development", "production"])
  @IsOptional()
  environment?: "development" | "production";
}

/**
 * 验证证书DTO
 */
export class VerifyCertificateDto {
  @IsString()
  paymentMethod: "wechat" | "alipay";

  @IsEnum(["development", "production"])
  environment: "development" | "production";
}
