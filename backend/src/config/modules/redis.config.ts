import { ConfigService } from "@nestjs/config";

/**
 * Redis 配置接口
 */
export interface RedisConfig {
  /** Redis 是否启用 */
  enabled: boolean;
  /** Redis 主机地址 */
  host?: string;
  /** Redis 端口 */
  port: number;
  /** Redis 密码 */
  password?: string;
  /** Redis 数据库索引 */
  db: number;
}

/**
 * Redis 配置工厂
 *
 * 从 ConfigService 读取 Redis 相关环境变量
 * 如果 Redis 未启用，返回默认配置
 */
export const redisConfig = (configService: ConfigService): RedisConfig => {
  const enabled = configService.get<boolean>("REDIS_ENABLED", false);

  return {
    enabled,
    host: configService.get<string>("REDIS_HOST"),
    port: configService.get<number>("REDIS_PORT", 6379),
    password: configService.get<string>("REDIS_PASSWORD") || undefined,
    db: configService.get<number>("REDIS_DB", 0),
  };
};

/**
 * 获取 BullMQ Redis 连接配置
 *
 * 返回符合 BullModule.forRoot 的 Redis 配置对象
 */
export const bullRedisConfig = (
  configService: ConfigService,
): {
  host: string;
  port: number;
  password?: string;
  db: number;
} | null => {
  const config = redisConfig(configService);

  if (!config.enabled || !config.host) {
    return null;
  }

  return {
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
  };
};
