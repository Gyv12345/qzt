import { request } from '@/lib/api-client';
import type { LoginRequest, LoginResponse, User } from '@/types';

// 登录
export const login = (data: LoginRequest) => {
  return request.post<LoginResponse>('/auth/login', data);
};

// 登出
export const logout = () => {
  return request.post('/auth/logout');
};

// 获取当前用户信息
export const getCurrentUser = () => {
  return request.get<User>('/auth/me');
};

// 刷新 token
export const refreshToken = () => {
  return request.post<{ access_token: string }>('/auth/refresh');
};
