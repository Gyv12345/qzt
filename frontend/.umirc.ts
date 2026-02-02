import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: false,
  port: 3456,
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
  npmClient: 'pnpm',
  mfsu: {},
  theme: {
    'primary-color': '#1890ff',
  },
  proxy: {
    '/api': {
      target: 'http://localhost:7890',
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    },
  },
});
