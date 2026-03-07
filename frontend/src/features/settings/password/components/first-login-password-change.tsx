import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@/lib/zod-resolver";
import { useNavigate } from "@tanstack/react-router";
import { Lock, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { PasswordInput } from "@/components/password-input";
import { getScrmApi } from "@/services/api";
import { toast } from "sonner";

const formSchema = z
  .object({
    currentPassword: z.string().min(1, "请输入当前密码"),
    newPassword: z
      .string()
      .min(6, "新密码至少 6 个字符")
      .regex(/[A-Z]/, "新密码必须包含至少一个大写字母")
      .regex(/[a-z]/, "新密码必须包含至少一个小写字母")
      .regex(/[0-9]/, "新密码必须包含至少一个数字"),
    confirmPassword: z.string().min(1, "请确认新密码"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

export function FirstLoginPasswordChange() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // 检查是否有临时 token
  useEffect(() => {
    const hasTempToken = sessionStorage.getItem("auth_temp_password_change");
    if (!hasTempToken) {
      toast.error("无效的访问");
      navigate({ to: "/login", replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      // 调用修改密码 API（api-client 会自动从 sessionStorage 获取 token）
      const { usersControllerUpdatePassword } = getScrmApi();
      await usersControllerUpdatePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      // 获取临时 token 和用户信息，然后清除
      const tempToken = sessionStorage.getItem("auth_temp_password_change");
      const tempUser = sessionStorage.getItem("auth_temp_user");

      // 清除临时存储
      sessionStorage.removeItem("auth_temp_password_change");

      // 将临时用户信息转为正式存储（用于后续的 2FA 设置）
      if (tempToken && tempUser) {
        localStorage.setItem("auth_accessToken", tempToken);
        localStorage.setItem("auth_user", tempUser);
        sessionStorage.removeItem("auth_temp_user");
      }

      // 跳转到 2FA 设置页面
      navigate({ to: "/setup-2fa", replace: true });
    } catch (error: any) {
      // 错误已在 toast 中显示
      console.error("密码修改失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-svh bg-slate-50/50 dark:bg-slate-950 flex items-center justify-center p-6">
      {/* 背景装饰 */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-4">
            <Lock className="h-8 w-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            首次登录需修改密码
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            为了保障您的账户安全，请设置一个新密码
          </p>
        </div>

        {/* 密码表单 */}
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-6">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-4"
            >
              <FieldGroup>
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel>当前密码</FieldLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="输入当前密码"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel>新密码</FieldLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="输入新密码（至少6个字符）"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabel>确认新密码</FieldLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="再次输入新密码"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FieldGroup>

              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
                <ShieldCheck className="h-4 w-4 inline-block mr-2" />
                密码要求：至少6个字符，包含大小写字母和数字
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    设置中...
                  </>
                ) : (
                  "设置新密码并继续"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
