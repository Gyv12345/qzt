import axios, { type AxiosInstance, type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/types';
import { QueryClient } from '@tanstack/react-query';

// 创建 axios 实例
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:7890',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加 token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;

      // 401: 未授权,跳转登录页
      if (status === 401) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }

      // 403: 无权限
      if (status === 403) {
        console.error('没有权限访问');
      }

      // 404: 资源不存在
      if (status === 404) {
        console.error('请求的资源不存在');
      }

      // 500: 服务器错误
      if (status >= 500) {
        console.error('服务器错误,请稍后重试');
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      console.error('网络错误,请检查网络连接');
    } else {
      // 其他错误
      console.error('请求失败:', error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;

// 通用 API 请求方法
export const request = {
  get: <T>(url: string, params?: any): Promise<ApiResponse<T>> => {
    return apiClient.get(url, { params });
  },

  post: <T>(url: string, data?: any): Promise<ApiResponse<T>> => {
    return apiClient.post(url, data);
  },

  put: <T>(url: string, data?: any): Promise<ApiResponse<T>> => {
    return apiClient.put(url, data);
  },

  patch: <T>(url: string, data?: any): Promise<ApiResponse<T>> => {
    return apiClient.patch(url, data);
  },

  delete: <T>(url: string): Promise<ApiResponse<T>> => {
    return apiClient.delete(url);
  },
};

// 创建 QueryClient
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 分钟
    },
  },
});
