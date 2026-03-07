import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface LogOptions {
  lines: number;
  level?: string;
  search?: string;
}

export interface LogStats {
  totalLines: number;
  errorCount: number;
  warnCount: number;
  requestCount?: number;
  lastUpdate: string;
}

export interface LogsResponse {
  logs: string[];
  stats: LogStats;
}

@Injectable()
export class SystemLogsService {
  private readonly logger = new Logger(SystemLogsService.name);
  private readonly isProduction: boolean;

  constructor(private configService: ConfigService) {
    this.isProduction =
      this.configService.get<string>("NODE_ENV") === "production";
  }

  async getLogs(type: string, options: LogOptions): Promise<LogsResponse> {
    switch (type) {
      case "pm2":
        return this.getPm2Logs(options);
      case "nginx":
        return this.getNginxLogs(options);
      case "redis":
        return this.getRedisLogs(options);
      default:
        throw new Error(`Unsupported log type: ${type}`);
    }
  }

  private async getPm2Logs(options: LogOptions): Promise<LogsResponse> {
    const logs: string[] = [];
    const stats: LogStats = {
      totalLines: 0,
      errorCount: 0,
      warnCount: 0,
      lastUpdate: new Date().toISOString(),
    };

    if (this.isProduction) {
      // 生产环境：优先读取 PM2 合并日志文件
      const logPaths = [
        "/opt/qzt/backend/logs/pm2-combined.log",
        "/opt/qzt/website/logs/pm2-combined.log",
        "/opt/qzt/backend/logs/error.log",
        "/opt/qzt/backend/logs/out.log",
        "/root/.pm2/logs/qzt-backend-error.log",
        "/root/.pm2/logs/qzt-backend-out.log",
        "/root/.pm2/logs/qzt-website-error.log",
        "/root/.pm2/logs/qzt-website-out.log",
      ];

      for (const logPath of logPaths) {
        try {
          const content = await this.readLogFile(logPath, options);
          logs.push(...content.logs);
          stats.errorCount += content.stats.errorCount;
          stats.warnCount += content.stats.warnCount;
        } catch (error) {
          // 文件不存在或无权限，继续尝试下一个路径
          this.logger.debug(`Cannot read ${logPath}: ${error.message}`);
        }
      }

      // 如果文件读取失败，降级到 PM2 命令
      if (logs.length === 0) {
        try {
          const pm2Logs = await this.getPm2LogsViaCommand(options.lines);
          logs.push(...pm2Logs);
        } catch (error) {
          this.logger.warn(`PM2 command failed: ${error.message}`);
        }
      }
    } else {
      // 开发环境：模拟日志数据
      logs.push(
        `[${new Date().toISOString()}] INFO: Backend service running on port ${this.configService.get("BACKEND_PORT", "7890")}`,
        `[${new Date(Date.now() - 60000).toISOString()}] INFO: Database connection established`,
        `[${new Date(Date.now() - 120000).toISOString()}] INFO: Redis connection initialized`,
        `[${new Date(Date.now() - 180000).toISOString()}] WARN: High memory usage detected (75%)`,
        `[${new Date(Date.now() - 240000).toISOString()}] INFO: Scheduled job "cleanup" executed successfully`,
        `[${new Date(Date.now() - 300000).toISOString()}] INFO: API request processed: GET /api/users - 200 (45ms)`,
        `[${new Date(Date.now() - 360000).toISOString()}] ERROR: Failed to send email notification - connection timeout`,
        `[${new Date(Date.now() - 420000).toISOString()}] INFO: User authentication successful`,
        `[${new Date(Date.now() - 480000).toISOString()}] WARN: Slow query detected (350ms)`,
        `[${new Date(Date.now() - 540000).toISOString()}] INFO: WebSocket connection established`,
      );
      stats.errorCount = 1;
      stats.warnCount = 2;
    }

    return this.parseLogLines(logs, options);
  }

  private async getNginxLogs(options: LogOptions): Promise<LogsResponse> {
    const logs: string[] = [];
    const stats: LogStats = {
      totalLines: 0,
      errorCount: 0,
      warnCount: 0,
      requestCount: 0,
      lastUpdate: new Date().toISOString(),
    };

    if (this.isProduction) {
      const logPaths = [
        "/var/log/nginx/access.log",
        "/var/log/nginx/error.log",
      ];

      for (const logPath of logPaths) {
        try {
          const content = await this.readLogFile(logPath, options);
          logs.push(...content.logs);
        } catch (error) {
          this.logger.debug(`Cannot read ${logPath}: ${error.message}`);
        }
      }
    } else {
      // 开发环境：模拟 Nginx 日志
      const now = Date.now();
      for (let i = 0; i < 20; i++) {
        const timestamp = new Date(now - i * 30000);
        const ip = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        const method = ["GET", "POST", "PUT", "DELETE"][
          Math.floor(Math.random() * 4)
        ];
        const path = [
          "/api/users",
          "/api/customers",
          "/api/contracts",
          "/api/login",
        ][Math.floor(Math.random() * 4)];
        const status =
          Math.random() > 0.9 ? 500 : Math.random() > 0.8 ? 404 : 200;
        const responseTime = Math.floor(Math.random() * 500) + 10;

        logs.push(
          `[${timestamp.toISOString()}] ${ip} - - "${method} ${path} HTTP/1.1" ${status} ${Math.floor(Math.random() * 5000)} "-" "Mozilla/5.0" - ${responseTime}ms`,
        );
      }
      stats.requestCount = 20;
      stats.errorCount = 2;
    }

    return this.parseLogLines(logs, options);
  }

  private async getRedisLogs(options: LogOptions): Promise<LogsResponse> {
    const logs: string[] = [];
    const stats: LogStats = {
      totalLines: 0,
      errorCount: 0,
      warnCount: 0,
      lastUpdate: new Date().toISOString(),
    };

    if (this.isProduction) {
      const logPaths = [
        "/var/log/redis/redis-server.log",
        "/var/log/redis/redis.log",
      ];

      for (const logPath of logPaths) {
        try {
          const content = await this.readLogFile(logPath, options);
          logs.push(...content.logs);
        } catch (error) {
          this.logger.debug(`Cannot read ${logPath}: ${error.message}`);
        }
      }
    } else {
      // 开发环境：模拟 Redis 日志
      const now = Date.now();
      for (let i = 0; i < 15; i++) {
        const timestamp = new Date(now - i * 60000);
        const level = Math.random() > 0.9 ? "warning" : "notice";
        const message = [
          "Ready to accept connections",
          "Background saving terminated with success",
          "DB changed from 0 to 1",
          "Client id=12345 scheduled to be closed ASAP for crossing of soft memory limit",
          "Asking PERSIST to connection for key: session:abc123",
        ][Math.floor(Math.random() * 5)];

        logs.push(
          `[${timestamp.toISOString().split("T")[0]} ${timestamp.toTimeString().split(" ")[0]}] ${level} ${message}`,
        );
      }
      stats.warnCount = 3;
    }

    return this.parseLogLines(logs, options);
  }

  private async readLogFile(
    filePath: string,
    options: LogOptions,
  ): Promise<LogsResponse> {
    try {
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split("\n").filter(Boolean);
      const tailLines = lines.slice(-options.lines);

      return this.parseLogLines(tailLines, options);
    } catch (error) {
      if (error.code === "ENOENT") {
        throw new Error(`Log file not found: ${filePath}`);
      }
      if (error.code === "EACCES") {
        throw new Error(`Permission denied reading: ${filePath}`);
      }
      throw error;
    }
  }

  private async getPm2LogsViaCommand(lines: number): Promise<string[]> {
    try {
      const { stdout } = await execAsync(
        `pm2 logs --nostream --lines ${lines} --raw`,
      );
      return stdout.split("\n").filter(Boolean);
    } catch (error) {
      this.logger.error(`PM2 command failed: ${error.message}`);
      return [];
    }
  }

  private parseLogLines(lines: string[], options: LogOptions): LogsResponse {
    let filteredLines = [...lines];

    // 应用级别过滤
    if (options.level && options.level !== "all") {
      filteredLines = filteredLines.filter((line) => {
        const upperLine = line.toUpperCase();
        switch (options.level.toLowerCase()) {
          case "error":
            return upperLine.includes("ERROR") || upperLine.includes("CRIT");
          case "warn":
            return upperLine.includes("WARN") || upperLine.includes("WARNING");
          case "info":
            return upperLine.includes("INFO");
          default:
            return true;
        }
      });
    }

    // 应用搜索过滤
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filteredLines = filteredLines.filter((line) =>
        line.toLowerCase().includes(searchLower),
      );
    }

    // 统计
    const stats: LogStats = {
      totalLines: filteredLines.length,
      errorCount: filteredLines.filter((line) =>
        line.toUpperCase().includes("ERROR"),
      ).length,
      warnCount: filteredLines.filter((line) =>
        line.toUpperCase().includes("WARN"),
      ).length,
      requestCount: filteredLines.filter(
        (line) =>
          line.includes("HTTP/") ||
          line.includes("GET ") ||
          line.includes("POST "),
      ).length,
      lastUpdate: new Date().toISOString(),
    };

    return {
      logs: filteredLines,
      stats,
    };
  }
}
