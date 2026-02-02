import { defineConfig } from 'orval'

export default defineConfig({
  api: {
    output: {
      mode: 'split',
      target: 'src/services/api.ts',
      schemas: 'src/models',
      client: 'axios',
      override: {
        mutator: {
          path: 'src/services/mutator.ts',
          name: 'customInstance',
        },
        query: {
          useInfinite: true,
          useInfiniteQueryParam: 'page',
        },
      },
    },
    input: {
      target: 'http://localhost:7890/api-docs-json',
    },
  },
})
