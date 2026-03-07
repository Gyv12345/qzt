import { z } from "zod";

/**
 * 布尔值转换辅助函数
 * 正确处理字符串 "true"/"false" 为布尔值
 */
const booleanString = () =>
  z.string().transform((val) => {
    return val === "true" || val === "1";
  });

/**
 * 环境变量 Zod 验证 Schema
 *
 * 统一的环境变量验证，替代 Joi
 * 支持条件验证和类型安全
 */

// 基础环境变量 Schema
const baseEnvSchema = z.object({
  // ========== 环境配置 ==========
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // ========== 数据库配置 ==========
  DATABASE_PROVIDER: z.enum(["sqlite", "mysql"]).default("sqlite"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL 不能为空"),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306).optional(),
  DB_USERNAME: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_DATABASE: z.string().optional(),

  // ========== Redis 配置 ==========
  REDIS_ENABLED: booleanString().default(false),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce
    .number()
    .int()
    .min(1)
    .max(65535)
    .default(6379)
    .optional(),
  REDIS_PASSWORD: z.string().default("").optional(),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0).optional(),

  // ========== OSS 配置 ==========
  OSS_ENABLED: booleanString().default(false),
  OSS_REGION: z.string().optional(),
  OSS_ACCESS_KEY_ID: z.string().optional(),
  OSS_ACCESS_KEY_SECRET: z.string().optional(),
  OSS_BUCKET: z.string().optional(),
  OSS_ENDPOINT: z.string().optional(),
  OSS_PREFIX: z.string().default("qzt/").optional(),

  // ========== JWT 配置 ==========
  JWT_SECRET: z.string().min(32, "JWT_SECRET 长度不能少于 32 位"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // ========== 应用配置 ==========
  APP_NAME: z.string().default("企智通"),
  APP_URL: z.string().url("APP_URL 必须是有效的 URL"),
  API_URL: z.string().url("API_URL 必须是有效的 URL"),
  FRONTEND_URL: z.string().url("FRONTEND_URL 必须是有效的 URL"),
  BACKEND_PORT: z.coerce.number().int().min(1).max(65535).default(7890),

  // ========== 2FA TOTP 配置 ==========
  TOTP_APP_NAME: z.string().default("企智通"),
  TOTP_ENCRYPTION_KEY: z.string().optional(),

  // ========== 并发优化配置 ==========
  PM2_CLUSTER_ENABLED: booleanString().default(false),
  THROTTLE_TTL: z.coerce.number().default(60000),
  THROTTLE_LIMIT: z.coerce.number().default(100),

  // ========== 支付配置 ==========
  PAYMENT_MODE: z.enum(["mock", "alipay", "wechat"]).default("mock"),

  // ========== e签宝配置 ==========
  ESIGN_APP_ID: z.string().optional(),
  ESIGN_APP_SECRET: z.string().optional(),
  ESIGN_URL: z.string().optional(),

  // ========== CORS 配置 ==========
  CORS_ORIGINS: z.string().optional(),
  CORS_CREDENTIALS: booleanString().default(true),
});

// 条件验证：根据配置状态检查必需字段
export const envSchema = baseEnvSchema
  .refine(
    (data) => {
      // MySQL 模式下必须配置完整连接信息
      if (data.DATABASE_PROVIDER === "mysql") {
        return (
          !!data.DB_HOST &&
          !!data.DB_USERNAME &&
          !!data.DB_PASSWORD &&
          !!data.DB_DATABASE
        );
      }
      return true;
    },
    {
      message:
        "MySQL 模式下必须配置 DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE",
      path: ["DATABASE_PROVIDER"],
    },
  )
  .refine(
    (data) => {
      // Redis 已启用时必须有主机地址
      if (data.REDIS_ENABLED) {
        return !!data.REDIS_HOST;
      }
      return true;
    },
    {
      message: "Redis 已启用但缺少 REDIS_HOST 配置",
      path: ["REDIS_HOST"],
    },
  )
  .refine(
    (data) => {
      // OSS 已启用时必须有完整配置
      if (data.OSS_ENABLED) {
        return (
          !!data.OSS_REGION &&
          !!data.OSS_ACCESS_KEY_ID &&
          !!data.OSS_ACCESS_KEY_SECRET &&
          !!data.OSS_BUCKET
        );
      }
      return true;
    },
    {
      message:
        "OSS 已启用但缺少必要配置 (OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET, OSS_BUCKET)",
      path: ["OSS_ENABLED"],
    },
  );

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * 验证环境变量
 *
 * 用于 ConfigModule.validate
 * 如果验证失败会抛出详细的错误信息
 */
export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    throw new Error(`环境变量验证失败:\n${errors}`);
  }

  return result.data;
}
