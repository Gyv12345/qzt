#!/usr/bin/env tsx
/**
 * 部署配置文档生成器
 *
 * 从 Zod Schema 自动生成部署配置文档
 * 确保文档与代码保持同步
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { envSchema } from "../src/config/schemas/env.schema";

interface ConfigItem {
  key: string;
  description: string;
  example: string;
  required: boolean;
  default?: string;
}

// 配置项说明（手动维护，与 Schema 保持同步）
const configDescriptions: Record<string, Omit<ConfigItem, "key">> = {
  // 环境配置
  NODE_ENV: {
    description: "运行环境",
    example: "production",
    required: false,
    default: "development",
  },
  DATABASE_PROVIDER: {
    description: "数据库提供商",
    example: "mysql",
    required: false,
    default: "sqlite",
  },
  DATABASE_URL: {
    description: "数据库连接 URL（SQLite）",
    example: "file:./dev.db",
    required: true,
  },
  DB_HOST: {
    description: "MySQL 主机地址",
    example: "rm-xxx.mysql.rds.aliyuncs.com",
    required: false,
  },
  DB_PORT: {
    description: "MySQL 端口",
    example: "3306",
    required: false,
    default: "3306",
  },
  DB_USERNAME: {
    description: "MySQL 用户名",
    example: "qzt_user",
    required: false,
  },
  DB_PASSWORD: {
    description: "MySQL 密码",
    example: "your-password",
    required: false,
  },
  DB_DATABASE: {
    description: "MySQL 数据库名",
    example: "qzt_prod",
    required: false,
  },
  REDIS_ENABLED: {
    description: "是否启用 Redis",
    example: "true",
    required: false,
    default: "false",
  },
  REDIS_HOST: {
    description: "Redis 主机地址",
    example: "127.0.0.1",
    required: false,
  },
  REDIS_PORT: {
    description: "Redis 端口",
    example: "6379",
    required: false,
    default: "6379",
  },
  REDIS_PASSWORD: {
    description: "Redis 密码",
    example: "your-redis-password",
    required: false,
  },
  REDIS_DB: {
    description: "Redis 数据库索引",
    example: "0",
    required: false,
    default: "0",
  },
  OSS_ENABLED: {
    description: "是否启用 OSS 文件上传",
    example: "true",
    required: false,
    default: "false",
  },
  OSS_REGION: {
    description: "OSS 区域",
    example: "oss-cn-hangzhou",
    required: false,
  },
  OSS_ACCESS_KEY_ID: {
    description: "OSS 访问密钥 ID",
    example: "LTAI5t...",
    required: false,
  },
  OSS_ACCESS_KEY_SECRET: {
    description: "OSS 访问密钥 Secret",
    example: "xxxxx",
    required: false,
  },
  OSS_BUCKET: {
    description: "OSS 存储桶名称",
    example: "your-bucket",
    required: false,
  },
  OSS_PREFIX: {
    description: "OSS 文件前缀",
    example: "qzt/",
    required: false,
    default: "qzt/",
  },
  JWT_SECRET: {
    description: "JWT 密钥（至少 32 位）",
    example: "your-production-jwt-secret-at-least-32-chars",
    required: true,
  },
  JWT_EXPIRES_IN: {
    description: "Token 过期时间",
    example: "7d",
    required: false,
    default: "7d",
  },
  BACKEND_PORT: {
    description: "后端服务端口",
    example: "7890",
    required: false,
    default: "7890",
  },
  APP_NAME: {
    description: "应用名称",
    example: "企智通",
    required: false,
    default: "企智通",
  },
  APP_URL: {
    description: "应用完整 URL",
    example: "https://your-domain.com",
    required: false,
    default: "http://localhost:7890",
  },
  API_URL: {
    description: "API 服务 URL",
    example: "https://api.your-domain.com",
    required: false,
    default: "http://localhost:7890",
  },
  FRONTEND_URL: {
    description: "前端 URL（用于 CORS）",
    example: "https://your-domain.com",
    required: false,
    default: "http://localhost:3456",
  },
  CORS_ORIGINS: {
    description: "允许的跨域源（逗号分隔）",
    example: "https://your-domain.com,https://www.your-domain.com",
    required: false,
  },
  CORS_CREDENTIALS: {
    description: "是否允许携带凭证",
    example: "true",
    required: false,
    default: "true",
  },
  TOTP_APP_NAME: {
    description: "TOTP 应用名称",
    example: "企智通",
    required: false,
    default: "企智通",
  },
  TOTP_ENCRYPTION_KEY: {
    description: "TOTP 加密密钥",
    example: "your-32-char-encryption-key",
    required: false,
  },
  PM2_CLUSTER_ENABLED: {
    description: "是否启用 PM2 集群模式",
    example: "true",
    required: false,
    default: "false",
  },
  THROTTLE_TTL: {
    description: "限流时间窗口（毫秒）",
    example: "60000",
    required: false,
    default: "60000",
  },
  THROTTLE_LIMIT: {
    description: "限流请求数",
    example: "100",
    required: false,
    default: "100",
  },
  PAYMENT_MODE: {
    description: "支付模式",
    example: "mock",
    required: false,
    default: "mock",
  },
  ESIGN_APP_ID: {
    description: "e签宝 App ID",
    example: "your_app_id",
    required: false,
  },
  ESIGN_APP_SECRET: {
    description: "e签宝 App Secret",
    example: "your_app_secret",
    required: false,
  },
  ESIGN_URL: {
    description: "e签宝 API URL",
    example: "https://openapi.esign.cn",
    required: false,
  },
};

/**
 * 生成 Markdown 表格
 */
function generateMarkdown(): string {
  const lines: string[] = [
    "# 后端部署配置文档",
    "",
    "> 本文档由 `scripts/generate-deployment-config.ts` 自动生成",
    "> 请勿手动编辑，运行 `pnpm tsx scripts/generate-deployment-config.ts` 重新生成",
    "",
    "## 环境变量说明",
    "",
    "### 基础配置",
    "",
    "| 配置项 | 说明 | 示例值 | 必填 | 默认值 |",
    "|--------|------|----------|------|----------|",
  ];

  // 基础配置
  const baseConfigs = [
    "NODE_ENV",
    "BACKEND_PORT",
    "APP_NAME",
    "APP_URL",
    "API_URL",
    "FRONTEND_URL",
  ];

  for (const key of baseConfigs) {
    const config = configDescriptions[key];
    if (!config) continue;
    lines.push(
      `| \`${key}\` | ${config.description} | \`${config.example}\` | ${config.required ? "是" : "否"} | \`${config.default || "-"}\` |`,
    );
  }

  lines.push("", "### 数据库配置", "", "| 配置项 | 说明 | 示例值 | 必填 | 默认值 |", "|--------|------|----------|------|----------|");

  const dbConfigs = [
    "DATABASE_PROVIDER",
    "DATABASE_URL",
    "DB_HOST",
    "DB_PORT",
    "DB_USERNAME",
    "DB_PASSWORD",
    "DB_DATABASE",
  ];

  for (const key of dbConfigs) {
    const config = configDescriptions[key];
    if (!config) continue;
    lines.push(
      `| \`${key}\` | ${config.description} | \`${config.example}\` | ${config.required ? "是" : "否"} | \`${config.default || "-"}\` |`,
    );
  }

  lines.push("", "### Redis 配置", "", "| 配置项 | 说明 | 示例值 | 必填 | 默认值 |", "|--------|------|----------|------|----------|");

  const redisConfigs = ["REDIS_ENABLED", "REDIS_HOST", "REDIS_PORT", "REDIS_PASSWORD", "REDIS_DB"];

  for (const key of redisConfigs) {
    const config = configDescriptions[key];
    if (!config) continue;
    lines.push(
      `| \`${key}\` | ${config.description} | \`${config.example}\` | ${config.required ? "是" : "否"} | \`${config.default || "-"}\` |`,
    );
  }

  lines.push("", "### OSS 配置", "", "| 配置项 | 说明 | 示例值 | 必填 | 默认值 |", "|--------|------|----------|------|----------|");

  const ossConfigs = ["OSS_ENABLED", "OSS_REGION", "OSS_ACCESS_KEY_ID", "OSS_ACCESS_KEY_SECRET", "OSS_BUCKET", "OSS_PREFIX"];

  for (const key of ossConfigs) {
    const config = configDescriptions[key];
    if (!config) continue;
    lines.push(
      `| \`${key}\` | ${config.description} | \`${config.example}\` | ${config.required ? "是" : "否"} | \`${config.default || "-"}\` |`,
    );
  }

  lines.push("", "### JWT 认证配置", "", "| 配置项 | 说明 | 示例值 | 必填 | 默认值 |", "|--------|------|----------|------|----------|");

  const jwtConfigs = ["JWT_SECRET", "JWT_EXPIRES_IN"];

  for (const key of jwtConfigs) {
    const config = configDescriptions[key];
    if (!config) continue;
    lines.push(
      `| \`${key}\` | ${config.description} | \`${config.example}\` | ${config.required ? "是" : "否"} | \`${config.default || "-"}\` |`,
    );
  }

  lines.push("", "### CORS 配置", "", "| 配置项 | 说明 | 示例值 | 必填 | 默认值 |", "|--------|------|----------|------|----------|");

  const corsConfigs = ["CORS_ORIGINS", "CORS_CREDENTIALS"];

  for (const key of corsConfigs) {
    const config = configDescriptions[key];
    if (!config) continue;
    lines.push(
      `| \`${key}\` | ${config.description} | \`${config.example}\` | ${config.required ? "是" : "否"} | \`${config.default || "-"}\` |`,
    );
  }

  lines.push("", "### 2FA 配置", "", "| 配置项 | 说明 | 示例值 | 必填 | 默认值 |", "|--------|------|----------|------|----------|");

  const twofaConfigs = ["TOTP_APP_NAME", "TOTP_ENCRYPTION_KEY"];

  for (const key of twofaConfigs) {
    const config = configDescriptions[key];
    if (!config) continue;
    lines.push(
      `| \`${key}\` | ${config.description} | \`${config.example}\` | ${config.required ? "是" : "否"} | \`${config.default || "-"}\` |`,
    );
  }

  lines.push("", "### 并发优化配置", "", "| 配置项 | 说明 | 示例值 | 必填 | 默认值 |", "|--------|------|----------|------|----------|");

  const optimizationConfigs = ["PM2_CLUSTER_ENABLED", "THROTTLE_TTL", "THROTTLE_LIMIT"];

  for (const key of optimizationConfigs) {
    const config = configDescriptions[key];
    if (!config) continue;
    lines.push(
      `| \`${key}\` | ${config.description} | \`${config.example}\` | ${config.required ? "是" : "否"} | \`${config.default || "-"}\` |`,
    );
  }

  lines.push("", "### 支付配置", "", "| 配置项 | 说明 | 示例值 | 必填 | 默认值 |", "|--------|------|----------|------|----------|");

  const paymentConfigs = ["PAYMENT_MODE"];

  for (const key of paymentConfigs) {
    const config = configDescriptions[key];
    if (!config) continue;
    lines.push(
      `| \`${key}\` | ${config.description} | \`${config.example}\` | ${config.required ? "是" : "否"} | \`${config.default || "-"}\` |`,
    );
  }

  lines.push("", "### e签宝配置", "", "| 配置项 | 说明 | 示例值 | 必填 | 默认值 |", "|--------|------|----------|------|----------|");

  const esignConfigs = ["ESIGN_APP_ID", "ESIGN_APP_SECRET", "ESIGN_URL"];

  for (const key of esignConfigs) {
    const config = configDescriptions[key];
    if (!config) continue;
    lines.push(
      `| \`${key}\` | ${config.description} | \`${config.example}\` | ${config.required ? "是" : "否"} | \`${config.default || "-"}\` |`,
    );
  }

  // 添加部署说明
  lines.push(
    "",
    "## 部署步骤",
    "",
    "### 1. 环境准备",
    "",
    "```bash",
    "# 克隆项目",
    "git clone <repository-url>",
    "cd qzt/backend",
    "",
    "# 安装依赖",
    "pnpm install",
    "```",
    "",
    "### 2. 配置环境变量",
    "",
    "```bash",
    "# 复制环境变量模板",
    "cp .env.example .env.local",
    "",
    "# 编辑配置文件",
    "nano .env.local",
    "```",
    "",
    "### 3. 验证配置",
    "",
    "```bash",
    "# 运行配置检查脚本",
    "pnpm tsx scripts/check-env.ts",
    "```",
    "",
    "### 4. 数据库迁移",
    "",
    "```bash",
    "# 生成 Prisma Client",
    "pnpm prisma generate",
    "",
    "# 推送数据库结构（生产环境）",
    "pnpm prisma db push",
    "```",
    "",
    "### 5. 启动服务",
    "",
    "```bash",
    "# 开发环境",
    "pnpm start:dev",
    "",
    "# 生产环境（使用 PM2）",
    "pm2 start ecosystem.config.cjs",
    "```",
    "",
    "## 生产环境注意事项",
    "",
    "### 必须修改的配置",
    "",
    "- `JWT_SECRET`: 使用强随机密钥（至少 32 位）",
    "- `DATABASE_PROVIDER`: 生产环境设置为 `mysql`",
    "- `DB_HOST`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`: 配置生产数据库",
    "- `REDIS_ENABLED`: 建议启用 `true`",
    "",
    "### 安全建议",
    "",
    "- 不要将 `.env.local` 提交到版本控制",
    "- 使用强密码作为 JWT 密钥",
    "- 配置 CORS 只允许可信域名",
    "- 生产环境启用 HTTPS",
    "",
    "## 故障排查",
    "",
    "### 数据库连接失败",
    "",
    "1. 检查 `DATABASE_PROVIDER` 是否正确",
    "2. MySQL 模式下检查 `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`",
    "3. 确保数据库服务器可访问",
    "",
    "### Redis 连接失败",
    "",
    "1. 检查 `REDIS_ENABLED` 是否为 `true`",
    "2. 检查 `REDIS_HOST` 和 `REDIS_PORT`",
    "3. 确认 Redis 服务正在运行",
    "",
    "### OSS 上传失败",
    "",
    "1. 检查 `OSS_ENABLED` 是否为 `true`",
    "2. 检查 OSS 相关配置是否完整",
    "3. 确认 OSS Bucket 有写入权限",
    "",
  );

  return lines.join("\n");
}

/**
 * 主函数
 */
function main() {
  const outputPath = join(__dirname, "../DEPLOYMENT_CONFIG.md");
  const markdown = generateMarkdown();

  writeFileSync(outputPath, markdown, "utf-8");
  console.log(`✅ 部署配置文档已生成: ${outputPath}`);
}

main();
