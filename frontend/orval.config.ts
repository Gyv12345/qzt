/**
 * Orval 配置 - OpenAPI TypeScript 客户端生成
 *
 * 参考 Orval 最佳实践：
 * - mode: tags - 按 API tags 拆分文件，适合大型项目
 * - client: axios - 使用 axios 作为 HTTP 客户端
 * - target: 指向目录，生成多个文件
 * - useDates: true - 将字符串转换为 Date 类型
 *
 * 生成命令：pnpm run generate:api
 */
import { defineConfig } from "orval";

export default defineConfig({
  qzt: {
    output: {
      mode: "tags",
      target: "src/services/api",
      schemas: "src/models",
      client: "axios",
      override: {
        mutator: {
          path: "src/services/api-client.ts",
          name: "customInstance",
        },
        // 📅 将符合 ISO 8601 格式的字符串转换为 Date 对象
        useDates: true,
      },
    },
    input: {
      target: "http://localhost:7890/api-docs-json",
    },
    hooks: {
      afterAllFilesWrite: "prettier --write",
    },
  },
});
