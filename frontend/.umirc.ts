import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: false,
  routes: [
    {
      path: '/',
      redirect: '/login',
    },
    {
      path: '/login',
      component: '@/pages/login',
    },
    {
      path: '/',
      component: '@/layouts/index',
      wrapper: '@/wrappers/auth',
      routes: [
        { path: '/dashboard', component: '@/pages/dashboard' },
        {
          path: '/customer',
          component: '@/pages/customer',
          access: 'canViewCustomer',
        },
      ],
    },
  ],
  npmClient: 'npm',
  webpack: {},
  devtool: 'cheap-module-source-map',
  distTimings: true,
  mfsu: {},
  nodeModulesTransform: {},
  extraBabelPlugins: [],
  terserOptions: {},
  theme: {
    'primary-color': '#1890ff',
  },
  proxy: {
    '/api': {
      target: 'http://localhost:3456',
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    },
  },
  openAPI: [
    {
      requestLibPath: "import { request } from '@umijs/max'",
      schemaPath: 'http://localhost:3456/api-docs-json',
      projectName: 'qzt',
    },
  ],
  port: 7890,
});
