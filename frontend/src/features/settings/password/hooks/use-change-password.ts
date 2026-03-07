import { useCallback } from "react";
import { toast } from "sonner";
import { getScrmApi } from "@/services/api";

interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
  twoFactorToken?: string;
}

interface ChangePasswordResult {
  message: string;
}

export function useChangePassword() {
  const changePassword = useCallback(
    async (params: ChangePasswordParams): Promise<ChangePasswordResult> => {
      const { usersControllerUpdatePassword } = getScrmApi();

      try {
        await usersControllerUpdatePassword(params);
        toast.success("密码修改成功");
        return { message: "密码修改成功" };
      } catch (error: any) {
        const message =
          error.response?.data?.message || error.message || "密码修改失败";
        toast.error(message);
        throw error;
      }
    },
    [],
  );

  return { changePassword };
}
