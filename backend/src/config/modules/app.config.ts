import { ConfigService } from "@nestjs/config";

/**
 * 应用配置接口
 */
export interface AppConfig {
  /** 应用名称 */
  name: string;
  /** 应用 URL */
  url: string;
  /** API URL */
  apiUrl: string;
  /** 前端 URL */
  frontendUrl: string;
  /** 后端端口 */
  port: number;
  /** 环境 */
  env: string;
  /** JWT 密钥 */
  jwtSecret: string;
  /** JWT 过期时间 */
  jwtExpiresIn: string;
  /** PM2 集群模式是否启用 */
  pm2ClusterEnabled: boolean;
  /** 限流 TTL (毫秒) */
  throttleTtl: number;
  /** 限流次数 */
  throttleLimit: number;
  /** TOTP 应用名称 */
  totpAppName: string;
  /** TOTP 加密密钥 */
  totpEncryptionKey?: string;
  /** 支付模式 */
  paymentMode: "mock" | "alipay" | "wechat";
  /** CORS 源 */
  corsOrigins?: string[];
  /** CORS 凭证 */
  corsCredentials: boolean;
}

/**
 * 应用配置工厂
 *
 * 从 ConfigService 读取应用相关环境变量
 */
export const appConfig = (configService: ConfigService): AppConfig => {
  const corsOriginsStr = configService.get<string>("CORS_ORIGINS");
  const corsOrigins = corsOriginsStr
    ? corsOriginsStr.split(",").map((s) => s.trim())
    : undefined;

  return {
    name: configService.get<string>("APP_NAME", "企智通"),
    url: configService.get<string>("APP_URL", "http://localhost:7890"),
    apiUrl: configService.get<string>("API_URL", "http://localhost:7890"),
    frontendUrl: configService.get<string>(
      "FRONTEND_URL",
      "http://localhost:3456",
    ),
    port: configService.get<number>("BACKEND_PORT", 7890),
    env: configService.get<string>("NODE_ENV", "development"),
    jwtSecret: configService.get<string>("JWT_SECRET", ""),
    jwtExpiresIn: configService.get<string>("JWT_EXPIRES_IN", "7d"),
    pm2ClusterEnabled: configService.get<boolean>("PM2_CLUSTER_ENABLED", false),
    throttleTtl: configService.get<number>("THROTTLE_TTL", 60000),
    throttleLimit: configService.get<number>("THROTTLE_LIMIT", 100),
    totpAppName: configService.get<string>("TOTP_APP_NAME", "企智通"),
    totpEncryptionKey: configService.get<string>("TOTP_ENCRYPTION_KEY"),
    paymentMode: configService.get<"mock" | "alipay" | "wechat">(
      "PAYMENT_MODE",
      "mock",
    ),
    corsOrigins,
    corsCredentials: configService.get<boolean>("CORS_CREDENTIALS", true),
  };
};

/**
 * e签宝配置接口
 */
export interface EsignConfig {
  /** e签宝 App ID */
  appId?: string;
  /** e签宝 App Secret */
  appSecret?: string;
  /** e签宝 API URL */
  url?: string;
}

/**
 * e签宝配置工厂
 */
export const esignConfig = (configService: ConfigService): EsignConfig => ({
  appId: configService.get<string>("ESIGN_APP_ID"),
  appSecret: configService.get<string>("ESIGN_APP_SECRET"),
  url: configService.get<string>("ESIGN_URL"),
});
