/**
 * 认证信息存储工具
 */

const ACCESS_TOKEN_KEY = "auth_accessToken";
const USER_INFO_KEY = "auth_user";

export interface StoredUser {
  id: string; // 兼容后端返回的 userId
  userId: string; // 后端实际返回的字段名
  username: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  status?: string;
  isAdmin?: boolean;
  departmentId?: string;
  createdAt?: string;
  updatedAt?: string;
  roles: Array<{
    id: string;
    name: string;
    code: string;
    type?: string;
    dataScope?: string;
    dataScopeDeptIds?: string | null;
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

/**
 * 获取用户 ID（兼容 id 和 userId 字段）
 */
export const getUserId = (user: StoredUser | null): string | undefined => {
  return user?.userId || user?.id;
};
