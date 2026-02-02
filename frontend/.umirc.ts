import { defineConfig } from '@umijs/max';
import themeConfig from './src/theme/themeConfig';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},  // 声明 request 插件，具体配置在 app.tsx
  layout: {
    name: '企账通 SCRM',
    logo: 'https://gw.alipayobjects.com/zos/antfincdn/PmY%24TNNdbI/logo.svg',
    locale: false,
    siderWidth: 240,
    theme: {
      'primary-color': '#1677FF',
    },
    // 内容区域的宽度
    contentWidth: 'Fluid',
    // 隐藏侧边栏底部的用户信息
    hideUserinfo: true,
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
