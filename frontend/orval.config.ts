import { defineConfig } from 'orval'

export default defineConfig({
  qzt: {
    output: {
      mode: 'tags',
      target: 'src/services/api/index.ts',
      schemas: 'src/models',
      client: 'axios',
      override: {
        mutator: {
          path: 'src/services/api-client.ts',
          name: 'customInstance',
        },
        query: {
          useInfinite: true,
          useInfiniteQueryParam: 'page',
        },
        // 注意：operations override 在 orval 8.x 中语法已改变
        // 如果需要覆盖特定操作的类型，请查看 orval 最新文档
      },
    },
    input: {
      target: 'http://localhost:7890/api-docs-json',
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write',
    },
  },
})
