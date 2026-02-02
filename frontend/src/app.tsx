import { RequestConfig } from '@umijs/max';
import { message } from 'antd';

export async function getInitialState() {
  const token = localStorage.getItem('token');
  const userInfo = localStorage.getItem('userInfo');

  // 如果没有用户信息，设置默认用户
  const defaultUser = {
    name: '管理员',
    avatar: 'https://gw.alipayobjects.com/zos/antfincdn/XAosXuNZyF/BiazfanxmamNRoxxVxka.png',
    userid: '00000001',
    email: 'admin@qzt.com',
  };

  return {
    token,
    userInfo: userInfo ? JSON.parse(userInfo) : defaultUser,
    name: userInfo ? JSON.parse(userInfo).name : defaultUser.name,
  };
}

export const request: RequestConfig = {
  timeout: 10000,
  // 开发环境添加 API 前缀
  prefix: '/api',
  errorConfig: {
    adaptor: (resData) => {
      // 后端成功响应没有 code 字段，直接返回数据
      // 错误响应会有 message 字段
      return {
        success: true,
        errorMessage: resData.message,
        data: resData,
      };
    },
  },
  requestInterceptors: [
    (config: any) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
  ],
  responseInterceptors: [
    (response) => {
      if (response.status === 401) {
        message.error('登录已过期,请重新登录');
        localStorage.removeItem('token');
        localStorage.removeItem('userInfo');
        window.location.href = '/login';
      }
      return response;
    },
  ],
};
