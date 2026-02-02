import { defineConfig } from '@umijs/max';
import themeConfig from './src/theme/themeConfig';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    name: '企账通',
    logo: false,
    locale: false,
    siderWidth: 240,
    theme: {
      'primary-color': '#1677FF',
    },
  },
  routes: [
    {
      path: '/login',
      component: '@/pages/login',
      layout: false,
    },
    {
      path: '/',
      redirect: '/customer',
    },
    {
      name: '客户管理',
      icon: 'UserOutlined',
      path: '/customer',
      component: '@/pages/customer',
    },
    {
      path: '/customer/:id',
      component: '@/pages/customer/detail',
      hideInMenu: true,
    },
    {
      name: '仪表盘',
      icon: 'DashboardOutlined',
      path: '/dashboard',
      component: '@/pages/dashboard',
    },
    {
      name: '合同管理',
      icon: 'FileTextOutlined',
      path: '/contract',
      component: '@/pages/placeholder',
    },
    {
      name: '产品管理',
      icon: 'AppstoreOutlined',
      path: '/product',
      component: '@/pages/placeholder',
    },
    {
      name: '系统设置',
      icon: 'SettingOutlined',
      path: '/system',
      component: '@/pages/placeholder',
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
