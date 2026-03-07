import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import * as authStorage from "@/lib/auth-storage";
import type { StoredUser } from "@/lib/auth-storage";

interface LoginResult {
  requiresPasswordChange?: boolean;
  requiresTwoFactorSetup?: boolean;
}

interface AuthContextType {
  user: StoredUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requires2FA: boolean; // 是否需要强制设置 2FA
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requires2FA, setRequires2FA] = useState(false);

  // 初始化：从 localStorage 恢复用户信息
  useEffect(() => {
    const storedUser = authStorage.getUserInfo();
    const token = authStorage.getToken();

    // 检查是否有临时的 2FA 设置标记
    const tempRequires2FA = sessionStorage.getItem("auth_temp_requires2FA");

    if (storedUser && token) {
      setUser(storedUser);
    }

    // 设置 requires2FA 状态
    if (tempRequires2FA === "true") {
      setRequires2FA(true);
    }

    setIsLoading(false);

    // 监听未授权事件
    const handleUnauthorized = () => {
      toast.error("登录已过期，请重新登录");
      authStorage.clearAuth();
      setUser(null);
      setRequires2FA(false);
      // 清除临时存储
      sessionStorage.removeItem("auth_temp_requires2FA");
      sessionStorage.removeItem("auth_temp_token");
      sessionStorage.removeItem("auth_temp_user");
      window.location.href = "/login";
    };

    window.addEventListener("unauthorized", handleUnauthorized);
    return () => window.removeEventListener("unauthorized", handleUnauthorized);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const { authControllerLogin } = getScrmApi();

      const data = (await authControllerLogin({ username, password })) as any;

      if (data?.access_token && data?.user) {
        // 检查是否需要强制修改密码（系统用户首次登录）
        if (data.requiresPasswordChange) {
          // 需要修改密码，临时存储 token
          sessionStorage.setItem(
            "auth_temp_password_change",
            data.access_token,
          );
          sessionStorage.setItem("auth_temp_user", JSON.stringify(data.user));
          setIsLoading(false);
          return { requiresPasswordChange: true };
        }

        // 检查是否需要强制设置 2FA
        if (data.requiresTwoFactorSetup) {
          // 临时存储 token 和用户信息
          sessionStorage.setItem("auth_temp_token", data.access_token);
          sessionStorage.setItem("auth_temp_user", JSON.stringify(data.user));
          sessionStorage.setItem("auth_temp_requires2FA", "true");
          setRequires2FA(true);
          setIsLoading(false);
          return { requiresTwoFactorSetup: true };
        }

        // 正常登录，保存认证信息
        authStorage.setAuth(data);
        setUser(data.user);

        toast.success("登录成功");
        return { requiresPasswordChange: false, requiresTwoFactorSetup: false };
      } else {
        throw new Error("登录响应格式错误");
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || "登录失败";
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authStorage.clearAuth();
    setUser(null);
    setRequires2FA(false);
    // 清除临时存储
    sessionStorage.removeItem("auth_temp_requires2FA");
    sessionStorage.removeItem("auth_temp_token");
    sessionStorage.removeItem("auth_temp_user");
    sessionStorage.removeItem("auth_temp_password_change");
    window.location.href = "/login";
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { authControllerGetUserInfo } = getScrmApi();
      const userData = (await authControllerGetUserInfo()) as any;
      authStorage.setUserInfo(userData);
      setUser(userData);
    } catch (error) {
      console.error("刷新用户信息失败:", error);
    }
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user || requires2FA,
    requires2FA,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
