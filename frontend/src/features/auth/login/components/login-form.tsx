import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { useAuth } from "@/contexts/auth-context";
import { TotpSetupDialog } from "@/features/two-factor";
import { useTwoFactor } from "@/features/two-factor";

const formSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码").min(6, "密码至少 6 个字符"),
});

export function LoginForm({
  className,
}: React.HTMLAttributes<HTMLFormElement>) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [setupData, setSetupData] = useState<{
    secret: string;
    qrCodeUrl: string;
    appName: string;
    accountName: string;
  } | null>(null);
  const { login } = useAuth();
  const { generateSetup, enableTwoFactor } = useTwoFactor();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  async function onSubmit(data: z.infer<typeof formSchema>) {
    console.log("[LoginForm] onSubmit 开始", { username: data.username });
    setIsLoading(true);
    try {
      const result = await login(data.username, data.password);
      console.log("[LoginForm] login 成功", result);

      // 检查是否需要强制设置 2FA
      if (result.requiresTwoFactorSetup) {
        const setup = await generateSetup();
        setSetupData(setup);
        setShowSetupDialog(true);
      } else {
        // 正常跳转
        window.location.href = "/";
      }
    } catch (error) {
      console.log("[LoginForm] login 失败", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleVerifyAndEnable = async (secret: string, token: string) => {
    const result = await enableTwoFactor(secret, token);
    return result;
  };

  const handleSetupComplete = () => {
    // 从 sessionStorage 恢复临时存储的认证信息
    const pendingToken = sessionStorage.getItem("pending_2fa_setup_token");
    const pendingUser = sessionStorage.getItem("pending_2fa_setup_user");

    if (pendingToken && pendingUser) {
      // 导入 authStorage
      import("@/lib/auth-storage").then(({ setAuth, setUserInfo }) => {
        const user = JSON.parse(pendingUser);
        setAuth({ access_token: pendingToken, user });
        setUserInfo(user);

        // 清除临时存储
        sessionStorage.removeItem("pending_2fa_setup_token");
        sessionStorage.removeItem("pending_2fa_setup_user");

        // 跳转到首页
        setShowSetupDialog(false);
        window.location.href = "/";
      });
    } else {
      // 如果没有临时存储，直接跳转（应该不会发生）
      setShowSetupDialog(false);
      window.location.href = "/";
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>用户名</FormLabel>
                <FormControl>
                  <Input placeholder="请输入用户名" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>密码</FormLabel>
                <FormControl>
                  <PasswordInput placeholder="请输入密码" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button className="mt-4 w-full" disabled={isLoading}>
            {isLoading ? <Loader2 className="animate-spin" /> : <LogIn />}
            登录
          </Button>
        </form>
      </Form>

      <TotpSetupDialog
        open={showSetupDialog}
        onOpenChange={setShowSetupDialog}
        setupData={setupData}
        onVerify={handleVerifyAndEnable}
        onComplete={handleSetupComplete}
      />
    </>
  );
}
