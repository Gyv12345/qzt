export default {
  requestLibPath: "import { request } from '@umijs/max'",
  schemaPath: 'http://localhost:3456/api-docs-json',
  projectName: 'qzt',
  serversPath: 'src/services',
  hooks: {
    afterOpenApiFileGenerated: (content) => {
      // 自定义生成后的处理
      return content;
    },
  },
};
