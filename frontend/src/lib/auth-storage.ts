/**
 * 认证信息存储工具
 */

const ACCESS_TOKEN_KEY = "access_token";
const USER_INFO_KEY = "user_info";

export interface StoredUser {
  id: string;
  username: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  roles: Array<{
    id: string;
    name: string;
    code: string;
  }>;
}

export interface LoginResponse {
  access_token: string;
  user: StoredUser;
}

/**
 * 获取存储的 token
 */
export const getToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

/**
 * 存储 token
 */
export const setToken = (token: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
};

/**
 * 移除 token
 */
export const removeToken = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
};

/**
 * 获取存储的用户信息
 */
export const getUserInfo = (): StoredUser | null => {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(USER_INFO_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

/**
 * 存储用户信息
 */
export const setUserInfo = (user: StoredUser): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
};

/**
 * 移除用户信息
 */
export const removeUserInfo = (): void => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(USER_INFO_KEY);
};

/**
 * 清除所有认证信息
 */
export const clearAuth = (): void => {
  removeToken();
  removeUserInfo();
};

/**
 * 存储登录响应
 */
export const setAuth = (response: LoginResponse): void => {
  setToken(response.access_token);
  setUserInfo(response.user);
};

/**
 * 检查是否已登录
 */
export const isAuthenticated = (): boolean => {
  return !!getToken();
};
