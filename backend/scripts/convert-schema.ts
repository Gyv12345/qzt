#!/usr/bin/env tsx
/**
 * Prisma Schema 转换脚本
 *
 * 将 SQLite schema 转换为 MySQL schema
 * 用于生产环境部署
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const SCHEMA_PATH = join(__dirname, "../prisma/schema.prisma");

/**
 * 转换 schema 文件
 */
function convertSchema(targetProvider: "sqlite" | "mysql") {
  const content = readFileSync(SCHEMA_PATH, "utf-8");

  // 替换 provider
  const updated = content.replace(
    /provider = "sqlite"/,
    `provider = "${targetProvider}"`,
  );

  writeFileSync(SCHEMA_PATH, updated, "utf-8");
  console.log(`✅ Schema 已转换为 ${targetProvider} 模式`);
}

/**
 * 主函数
 */
function main() {
  const target = process.argv[2] as "sqlite" | "mysql" | undefined;

  if (!target || !["sqlite", "mysql"].includes(target)) {
    console.error("❌ 用法: tsx scripts/convert-schema.ts [sqlite|mysql]");
    console.error("   示例: tsx scripts/convert-schema.ts mysql");
    process.exit(1);
  }

  convertSchema(target);
}

main();
