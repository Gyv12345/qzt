import { ConfigService } from "@nestjs/config";

/**
 * OSS 配置接口
 */
export interface OSSConfig {
  /** OSS 是否启用 */
  enabled: boolean;
  /** OSS 区域 */
  region?: string;
  /** OSS 访问密钥 ID */
  accessKeyId?: string;
  /** OSS 访问密钥 Secret */
  accessKeySecret?: string;
  /** OSS 存储桶名称 */
  bucket?: string;
  /** OSS 自定义域名 */
  endpoint?: string;
  /** OSS 文件前缀 */
  prefix: string;
}

/**
 * OSS 配置工厂
 *
 * 从 ConfigService 读取 OSS 相关环境变量
 * 如果 OSS 未启用，返回默认配置
 */
export const ossConfig = (configService: ConfigService): OSSConfig => {
  const enabled = configService.get<boolean>("OSS_ENABLED", false);

  return {
    enabled,
    region: configService.get<string>("OSS_REGION"),
    accessKeyId: configService.get<string>("OSS_ACCESS_KEY_ID"),
    accessKeySecret: configService.get<string>("OSS_ACCESS_KEY_SECRET"),
    bucket: configService.get<string>("OSS_BUCKET"),
    endpoint: configService.get<string>("OSS_ENDPOINT"),
    prefix: configService.get<string>("OSS_PREFIX", "qzt/"),
  };
};

/**
 * 验证 OSS 配置是否完整
 *
 * 如果 OSS 已启用但配置不完整，返回错误信息
 */
export function validateOSSConfig(config: OSSConfig): {
  valid: boolean;
  error?: string;
} {
  if (!config.enabled) {
    return { valid: true };
  }

  const required = ["region", "accessKeyId", "accessKeySecret", "bucket"];
  const missing = required.filter((key) => !config[key as keyof OSSConfig]);

  if (missing.length > 0) {
    return {
      valid: false,
      error: `OSS 配置不完整，缺少: ${missing.join(", ")}`,
    };
  }

  return { valid: true };
}
