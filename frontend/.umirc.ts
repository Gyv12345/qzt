import { defineConfig } from '@umijs/max';
import themeConfig from './src/theme/themeConfig';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: false, // 禁用内置布局，使用自定义布局
  routes: [
    {
      path: '/login',
      component: '@/pages/login',
    },
    {
      path: '/',
      component: '@/layouts/BasicLayout',
      routes: [
        {
          path: '/',
          redirect: '/customer',
        },
        {
          path: '/customer',
          component: '@/pages/customer',
        },
        {
          path: '/customer/:id',
          component: '@/pages/customer/detail',
        },
        {
          path: '/dashboard',
          component: '@/pages/dashboard',
        },
        {
          path: '/contract',
          component: '@/pages/placeholder',
        },
        {
          path: '/product',
          component: '@/pages/placeholder',
        },
        {
          path: '/system',
          component: '@/pages/placeholder',
        },
        {
          path: '/profile',
          component: '@/pages/placeholder',
        },
      ],
    },
  ],
  npmClient: 'pnpm',
  mfsu: {},
  theme: themeConfig,
  proxy: {
    '/api': {
      target: 'http://localhost:7890',
      changeOrigin: true,
      pathRewrite: { '^/api': '' },
    },
  },
});
