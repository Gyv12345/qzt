import { ConfigService } from "@nestjs/config";

/**
 * 数据库配置接口
 */
export interface DatabaseConfig {
  /** 数据库类型：sqlite | mysql */
  provider: "sqlite" | "mysql";
  /** 数据库连接 URL */
  url: string;
  /** MySQL 配置（仅在 provider=mysql 时有效） */
  mysql?: {
    host: string;
    port: number;
    username: string;
    password: string;
    database: string;
  };
}

/**
 * 数据库配置工厂
 *
 * 从 ConfigService 读取数据库相关环境变量
 * 根据 DATABASE_PROVIDER 返回相应的配置
 */
export const databaseConfig = (
  configService: ConfigService,
): DatabaseConfig => {
  const provider = configService.get<"sqlite" | "mysql">(
    "DATABASE_PROVIDER",
    "sqlite",
  );

  const baseConfig: DatabaseConfig = {
    provider,
    url: configService.get<string>("DATABASE_URL") || "file:./dev.db",
  };

  if (provider === "mysql") {
    const host = configService.get<string>("DB_HOST");
    const port = configService.get<number>("DB_PORT", 3306);
    const username = configService.get<string>("DB_USERNAME");
    const password = configService.get<string>("DB_PASSWORD");
    const database = configService.get<string>("DB_DATABASE");

    if (!host || !username || !password || !database) {
      throw new Error(
        "MySQL 模式下必须配置 DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE",
      );
    }

    // 构建 MySQL 连接 URL
    baseConfig.url = `mysql://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
    baseConfig.mysql = { host, port, username, password, database };
  }

  return baseConfig;
};

/**
 * 获取数据库连接 URL（兼容旧代码）
 *
 * @deprecated 使用 databaseConfig 替代
 */
export function getDatabaseUrl(configService: ConfigService): string {
  return databaseConfig(configService).url;
}
