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
        operations: {
          'AuthController_login': {
            response: {
              type: 'LoginResponseDto',
            },
          },
          'AuthController_getUserInfo': {
            response: {
              type: 'LoginUserDto',
            },
          },
        },
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
