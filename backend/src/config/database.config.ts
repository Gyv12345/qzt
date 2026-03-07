import { ConfigService } from "@nestjs/config";

/**
 * 获取数据库连接 URL（兼容旧代码）
 *
 * @deprecated 使用 databaseConfig 替代
 *
 * 如果传入 ConfigService，使用新配置系统
 * 否则使用 process.env（向后兼容）
 */
export function getDatabaseUrl(configService?: ConfigService): string {
  if (configService) {
    const provider = configService.get<"sqlite" | "mysql">(
      "DATABASE_PROVIDER",
      "sqlite",
    );

    if (provider === "mysql") {
      const host = configService.get<string>("DB_HOST");
      const port = configService.get<number>("DB_PORT", 3306);
      const username = configService.get<string>("DB_USERNAME");
      const password = configService.get<string>("DB_PASSWORD");
      const database = configService.get<string>("DB_DATABASE");

      if (!host || !username || !password || !database) {
        throw new Error(
          "MySQL configuration is incomplete. Please configure DB_HOST, DB_USERNAME, DB_PASSWORD, DB_DATABASE",
        );
      }

      return `mysql://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
    }

    return configService.get<string>("DATABASE_URL") || "file:./dev.db";
  }

  // 向后兼容：直接使用 process.env
  const provider = process.env.DATABASE_PROVIDER || "sqlite";

  if (provider === "mysql") {
    const {
      DB_HOST,
      DB_PORT = "3306",
      DB_USERNAME,
      DB_PASSWORD,
      DB_DATABASE,
    } = process.env;

    if (!DB_HOST || !DB_USERNAME || !DB_PASSWORD || !DB_DATABASE) {
      throw new Error("MySQL configuration is incomplete");
    }

    return `mysql://${DB_USERNAME}:${encodeURIComponent(DB_PASSWORD)}@${DB_HOST}:${DB_PORT}/${DB_DATABASE}`;
  } else {
    return process.env.DATABASE_URL || "file:./dev.db";
  }
}
