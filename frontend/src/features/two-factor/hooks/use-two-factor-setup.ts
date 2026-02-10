import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";
import type { SetupData } from "./use-two-factor";

export function useTwoFactorSetup() {
  const navigate = useNavigate();
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // 组件加载时自动生成设置信息
  useEffect(() => {
    const initSetup = async () => {
      // 检查是否有临时 token
      const hasTempToken =
        typeof window !== "undefined" &&
        !!sessionStorage.getItem("auth_temp_token");

      if (hasTempToken) {
        await generateSetup();
      } else {
        // 没有临时 token，跳转到登录页
        navigate({ to: "/login", replace: true });
      }
    };

    initSetup();
  }, [navigate]);

  // 生成 2FA 设置信息
  const generateSetup = useCallback(async () => {
    setIsLoading(true);
    try {
      const { twoFactorControllerSetup } = getScrmApi();
      const data = (await twoFactorControllerSetup()) as SetupData;
      setSetupData(data);
      setStep(1);
      return data;
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || "获取设置信息失败";
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 验证并启用 2FA
  const verifyAndEnable = useCallback(async (secret: string, token: string) => {
    setIsLoading(true);
    try {
      const { twoFactorControllerEnable } = getScrmApi();
      const result = await twoFactorControllerEnable({
        secret,
        token,
      });

      // 保存备份码
      if (result.backupCodes) {
        setBackupCodes(result.backupCodes);
      }
      setStep(3);

      return result;
    } catch (error: any) {
      const message =
        error.response?.data?.message || error.message || "验证失败";
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 完成 2FA 设置后的处理
  const completeSetup = useCallback(() => {
    // 清除临时标记
    sessionStorage.removeItem("auth_temp_requires2FA");

    // 将临时 token 转为正式存储
    const tempToken = sessionStorage.getItem("auth_temp_token");
    const tempUser = sessionStorage.getItem("auth_temp_user");

    if (tempToken && tempUser) {
      // 保存到 localStorage
      localStorage.setItem("auth_accessToken", tempToken);
      localStorage.setItem("auth_user", tempUser);

      // 清除临时存储
      sessionStorage.removeItem("auth_temp_token");
      sessionStorage.removeItem("auth_temp_user");
    }

    // 设置密码修改提醒标记
    localStorage.setItem("auth_requiresPasswordChange", "true");

    // 跳转到安全设置页面
    navigate({ to: "/settings/security", replace: true });
  }, [navigate]);

  return {
    setupData,
    isLoading,
    backupCodes,
    step,
    setStep,
    generateSetup,
    verifyAndEnable,
    completeSetup,
  };
}
