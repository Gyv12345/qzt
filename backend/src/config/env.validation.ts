import { z } from "zod";

/**
 * Zod 环境变量验证 Schema
 * 使用 Zod 替代 Joi，与项目中其他 Zod 用法保持一致
 */

// 数据库提供商枚举
const databaseProviderSchema = z.enum(["sqlite", "mysql"], {
  message: "DATABASE_PROVIDER 必须是 'sqlite' 或 'mysql'",
});

// 环境枚举
const nodeEnvSchema = z.enum(["development", "production", "test"], {
  message: "NODE_ENV 必须是 'development', 'production' 或 'test'",
});

/**
 * 基础环境变量 Schema（不包含条件依赖）
 */
const baseEnvSchema = z.object({
  // 环境配置
  NODE_ENV: nodeEnvSchema.default("development"),

  // 数据库配置
  DATABASE_PROVIDER: databaseProviderSchema.default("sqlite"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL 不能为空"),

  // MySQL 配置（当使用 MySQL 时必需）
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306).optional(),
  DB_USERNAME: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_DATABASE: z.string().optional(),

  // Redis 配置
  REDIS_ENABLED: z.coerce.boolean().default(false),
  REDIS_HOST: z.string().optional(),
  REDIS_PORT: z.coerce.number().int().min(1).max(65535).default(6379),
  REDIS_PASSWORD: z.string().default(""),
  REDIS_DB: z.coerce.number().int().min(0).max(15).default(0),

  // JWT 配置
  JWT_SECRET: z.string().min(32, "JWT_SECRET 至少需要 32 个字符"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // 服务端口
  BACKEND_PORT: z.coerce.number().int().min(1).max(65535).default(3456),

  // 应用配置
  APP_NAME: z.string().default("企智通"),
  APP_URL: z
    .string()
    .url("APP_URL 必须是有效的 URL")
    .default("http://localhost:7890"),
  API_URL: z
    .string()
    .url("API_URL 必须是有效的 URL")
    .default("http://localhost:3456"),
  FRONTEND_URL: z
    .string()
    .url("FRONTEND_URL 必须是有效的 URL")
    .default("http://localhost:7890"),

  // 2FA 配置
  TOTP_APP_NAME: z.string().default("企智通"),
  TOTP_ENCRYPTION_KEY: z.string().optional(),

  // 并发优化配置
  PM2_CLUSTER_ENABLED: z.coerce.boolean().default(false),
  THROTTLE_TTL: z.coerce.number().int().positive().default(60000),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(100),

  // 日志配置
  LOGS_RETENTION_DAYS: z.coerce.number().int().positive().default(90),

  // e签宝配置
  ESIGN_APP_ID: z.string().optional(),
  ESIGN_APP_SECRET: z.string().optional(),
  ESIGN_API_URL: z.string().url().default("https://openapi.esign.cn"),
});

/**
 * 完整环境变量 Schema（包含条件验证）
 */
export const envSchema = baseEnvSchema
  .refine(
    (data) => {
      // SQLite 需要 DATABASE_URL
      if (data.DATABASE_PROVIDER === "sqlite" && !data.DATABASE_URL) {
        return false;
      }
      // MySQL 需要完整的连接参数
      if (data.DATABASE_PROVIDER === "mysql") {
        return !!(
          data.DB_HOST &&
          data.DB_PORT &&
          data.DB_USERNAME &&
          data.DB_PASSWORD &&
          data.DB_DATABASE
        );
      }
      return true;
    },
    {
      message:
        "数据库配置不完整: SQLite 需要 DATABASE_URL，MySQL 需要 DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE",
    },
  )
  .refine(
    (data) => {
      // 如果启用 Redis，需要配置 REDIS_HOST
      if (data.REDIS_ENABLED && !data.REDIS_HOST) {
        return false;
      }
      return true;
    },
    {
      message: "Redis 已启用但缺少 REDIS_HOST 配置",
    },
  );

/**
 * 验证环境变量
 * @throws {Error} 当环境变量验证失败时抛出错误
 * @returns {z.infer<typeof envSchema>} 验证后的环境变量
 */
export const validateEnv = (): z.infer<typeof envSchema> => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("\n  ");
      throw new Error(`环境变量验证失败:\n  ${errorMessages}`);
    }
    throw error;
  }
};

/**
 * 导出环境变量类型
 */
export type EnvConfig = z.infer<typeof envSchema>;
