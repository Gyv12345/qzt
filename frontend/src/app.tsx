import { RequestConfig } from '@umijs/max';
import { message } from 'antd';

export async function getInitialState() {
  const token = localStorage.getItem('token');
  const userInfo = localStorage.getItem('userInfo');

  return {
    token,
    userInfo: userInfo ? JSON.parse(userInfo) : undefined,
  };
}

export const request: RequestConfig = {
  timeout: 10000,
  errorConfig: {
    adaptor: (resData) => {
      return {
        success: resData.code === 200,
        errorMessage: resData.message,
        data: resData.data,
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
