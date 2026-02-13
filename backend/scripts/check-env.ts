#!/usr/bin/env tsx
/**
 * 环境变量检查脚本
 *
 * 验证环境变量配置的完整性和一致性
 * 在部署前运行此脚本以确保配置正确
 */

import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "dotenv";

interface ValidationError {
  key: string;
  message: string;
  severity: "error" | "warning";
}

const errors: ValidationError[] = [];
const warnings: ValidationError[] = [];

/**
 * 加载环境变量文件
 */
function loadEnvFile(envPath: string): Record<string, string> {
  try {
    const content = readFileSync(envPath, "utf-8");
    return parse(content);
  } catch (error: any) {
    if (error.code === "ENOENT") {
      console.warn(`警告: 环境文件不存在: ${envPath}`);
      return {};
    }
    throw error;
  }
}

/**
 * 验证必填字段
 */
function validateRequired(
  env: Record<string, string>,
  key: string,
  description: string,
) {
  if (!env[key]) {
    errors.push({
      key,
      message: `缺少必填配置: ${description} (${key})`,
      severity: "error",
    });
  }
}

/**
 * 验证 URL 格式
 */
function validateUrl(env: Record<string, string>, key: string, description: string) {
  const value = env[key];
  if (!value) return;

  try {
    new URL(value);
  } catch {
    errors.push({
      key,
      message: `${description} 格式无效: ${value}`,
      severity: "error",
    });
  }
}

/**
 * 验证数据库配置
 */
function validateDatabase(env: Record<string, string>) {
  const provider = env.DATABASE_PROVIDER;

  if (!provider || !["sqlite", "mysql"].includes(provider)) {
    errors.push({
      key: "DATABASE_PROVIDER",
      message: `DATABASE_PROVIDER 必须是 sqlite 或 mysql，当前值: ${provider}`,
      severity: "error",
    });
    return;
  }

  if (provider === "sqlite") {
    if (!env.DATABASE_URL) {
      errors.push({
        key: "DATABASE_URL",
        message: "SQLite 模式下必须配置 DATABASE_URL",
        severity: "error",
      });
    }
  } else if (provider === "mysql") {
    const required = [
      "DB_HOST",
      "DB_USERNAME",
      "DB_PASSWORD",
      "DB_DATABASE",
    ];
    for (const key of required) {
      validateRequired(env, key, `MySQL 模式需要 ${key}`);
    }
  }
}

/**
 * 验证 Redis 配置
 */
function validateRedis(env: Record<string, string>) {
  const enabled = env.REDIS_ENABLED === "true";

  if (enabled) {
    if (!env.REDIS_HOST) {
      errors.push({
        key: "REDIS_HOST",
        message: "Redis 已启用但缺少 REDIS_HOST 配置",
        severity: "error",
      });
    }
  } else {
    warnings.push({
      key: "REDIS_ENABLED",
      message: "Redis 未启用，缓存和队列功能将不可用",
      severity: "warning",
    });
  }
}

/**
 * 验证 OSS 配置
 */
function validateOSS(env: Record<string, string>) {
  const enabled = env.OSS_ENABLED === "true";

  if (enabled) {
    const required = [
      "OSS_REGION",
      "OSS_ACCESS_KEY_ID",
      "OSS_ACCESS_KEY_SECRET",
      "OSS_BUCKET",
    ];
    for (const key of required) {
      validateRequired(env, key, `OSS 模式需要 ${key}`);
    }
  }
}

/**
 * 验证 JWT 配置
 */
function validateJWT(env: Record<string, string>) {
  const secret = env.JWT_SECRET;
  if (!secret) {
    errors.push({
      key: "JWT_SECRET",
      message: "JWT_SECRET 未配置",
      severity: "error",
    });
  } else if (secret.length < 32) {
    errors.push({
      key: "JWT_SECRET",
      message: `JWT_SECRET 长度不足 32 位（当前: ${secret.length} 位）`,
      severity: "error",
    });
  }

  // 检查是否使用默认密钥
  const insecureDefaults = [
    "change-this-jwt-secret-in-production",
    "your-jwt-secret-key-change-in-production",
    "sdlfkalskdjflaksjdflkasjd",
  ];
  if (insecureDefaults.some((d) => secret === d)) {
    warnings.push({
      key: "JWT_SECRET",
      message: "JWT_SECRET 使用了不安全的默认值，生产环境必须修改",
      severity: "warning",
    });
  }
}

/**
 * 验证应用配置
 */
function validateApp(env: Record<string, string>) {
  validateUrl(env, "APP_URL", "应用 URL");
  validateUrl(env, "API_URL", "API URL");
  validateUrl(env, "FRONTEND_URL", "前端 URL");

  const port = env.BACKEND_PORT;
  if (port) {
    const portNum = Number.parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      errors.push({
        key: "BACKEND_PORT",
        message: `BACKEND_PORT 必须是 1-65535 之间的数字，当前值: ${port}`,
        severity: "error",
      });
    }
  }
}

/**
 * 主验证函数
 */
function main() {
  const envPath =
    process.env.ENV_PATH || join(process.cwd(), ".env.local");

  console.log(`\n🔍 检查环境变量: ${envPath}\n`);

  const env = loadEnvFile(envPath);

  if (Object.keys(env).length === 0) {
    console.error("❌ 环境文件为空或不存在");
    console.log("\n💡 提示: 复制 .env.example 为 .env.local 并填写配置");
    process.exit(1);
  }

  // 执行各项验证
  validateDatabase(env);
  validateRedis(env);
  validateOSS(env);
  validateJWT(env);
  validateApp(env);

  // 输出结果
  let hasError = false;

  if (errors.length > 0) {
    console.error("❌ 配置错误:\n");
    for (const error of errors) {
      console.error(`  [${error.key}] ${error.message}`);
    }
    console.log("");
    hasError = true;
  }

  if (warnings.length > 0) {
    console.warn("⚠️  配置警告:\n");
    for (const warning of warnings) {
      console.warn(`  [${warning.key}] ${warning.message}`);
    }
    console.log("");
  }

  if (!hasError && warnings.length === 0) {
    console.log("✅ 环境变量配置检查通过");
  } else if (!hasError) {
    console.log("⚠️  环境变量配置有警告，建议修复后部署");
  }

  // 检查数据库提供商与环境变量的匹配性
  const provider = env.DATABASE_PROVIDER;
  if (provider === "mysql") {
    console.log("\n📊 数据库配置: MySQL");
    console.log(
      `   - 主机: ${env.DB_HOST}:${env.DB_PORT || 3306}`,
    );
    console.log(`   - 数据库: ${env.DB_DATABASE}`);
  } else {
    console.log("\n📊 数据库配置: SQLite (开发模式)");
  }

  if (env.REDIS_ENABLED === "true") {
    console.log(
      `📡 Redis: 已启用 (${env.REDIS_HOST}:${env.REDIS_PORT || 6379})`,
    );
  } else {
    console.log("📡 Redis: 未启用");
  }

  if (env.OSS_ENABLED === "true") {
    console.log(`📦 OSS: 已启用 (${env.OSS_BUCKET})`);
  } else {
    console.log("📦 OSS: 未启用");
  }

  console.log("");

  process.exit(hasError ? 1 : 0);
}

main();
