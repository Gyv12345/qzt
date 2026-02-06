import { useState, useCallback } from "react";
import { getScrmApi } from "@/services/api";

export interface TwoFactorStatus {
  enabled: boolean;
  hasCompletedFirstLogin?: boolean;
  setupCompletedAt?: string;
}

export interface SetupData {
  secret: string;
  qrCodeUrl: string;
  appName: string;
  accountName: string;
}

export function useTwoFactor() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSetup = useCallback(async (): Promise<SetupData> => {
    setIsLoading(true);
    setError(null);
    try {
      const { twoFactorControllerSetup } = getScrmApi();
      const response =
        (await twoFactorControllerSetup()) as unknown as SetupData;
      return response;
    } catch (err: any) {
      const message = err.message || "生成设置信息失败";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const enableTwoFactor = useCallback(
    async (
      secret: string,
      token: string,
    ): Promise<{ backupCodes: string[] }> => {
      setIsLoading(true);
      setError(null);
      try {
        const { twoFactorControllerEnable } = getScrmApi();
        const response = (await twoFactorControllerEnable({
          secret,
          token,
        })) as unknown as { backupCodes: string[] };
        return response;
      } catch (err: any) {
        const message = err.message || "启用 2FA 失败";
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const disableTwoFactor = useCallback(async (token: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const { twoFactorControllerDisable } = getScrmApi();
      await twoFactorControllerDisable({ token });
    } catch (err: any) {
      const message = err.message || "禁用 2FA 失败";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyTwoFactor = useCallback(
    async (
      token: string,
    ): Promise<{ valid: boolean; isBackupCode?: boolean }> => {
      setIsLoading(true);
      setError(null);
      try {
        const { twoFactorControllerVerify } = getScrmApi();
        const response = (await twoFactorControllerVerify({
          token,
        })) as unknown as { valid: boolean; isBackupCode?: boolean };
        return response;
      } catch (err: any) {
        const message = err.message || "验证失败";
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const getStatus = useCallback(async (): Promise<TwoFactorStatus> => {
    setIsLoading(true);
    setError(null);
    try {
      const { twoFactorControllerGetStatus } = getScrmApi();
      const response =
        (await twoFactorControllerGetStatus()) as unknown as TwoFactorStatus;
      return response;
    } catch (err: any) {
      const message = err.message || "获取 2FA 状态失败";
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const regenerateBackupCodes = useCallback(
    async (token: string): Promise<{ backupCodes: string[] }> => {
      setIsLoading(true);
      setError(null);
      try {
        const { twoFactorControllerRegenerateBackupCodes } = getScrmApi();
        const response = (await twoFactorControllerRegenerateBackupCodes({
          token,
        })) as unknown as { backupCodes: string[] };
        return response;
      } catch (err: any) {
        const message = err.message || "重新生成备份码失败";
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const verifyOperation = useCallback(
    async (token: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        const { twoFactorControllerVerifyOperation } = getScrmApi();
        const response = (await twoFactorControllerVerifyOperation({
          token,
        })) as unknown as { valid: boolean };
        return response.valid;
      } catch (err: any) {
        const message = err.message || "验证失败";
        setError(message);
        throw new Error(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    generateSetup,
    enableTwoFactor,
    disableTwoFactor,
    verifyTwoFactor,
    getStatus,
    regenerateBackupCodes,
    verifyOperation,
    isLoading,
    error,
  };
}
