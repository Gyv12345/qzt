import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck, ArrowRight, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/password-input";
import { useAuth } from "@/contexts/auth-context";
import { TotpSetupDialog } from "@/features/two-factor";
import { useTwoFactor } from "@/features/two-factor";

const formSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码").min(6, "密码至少 6 个字符"),
});

interface LoginConfig {
  siteName: string;
  companyName: string;
  logoUrl: string;
  icp: string;
  policeIcp: string;
  copyright: string;
  websiteUrl: string;
}

const defaultConfig: LoginConfig = {
  siteName: "企智通",
  companyName: "河南爱编程网络科技有限公司",
  logoUrl: "/images/qzt-logo.png",
  icp: "",
  policeIcp: "",
  copyright: `© ${new Date().getFullYear()} 河南爱编程网络科技有限公司 版权所有`,
  websiteUrl: "",
};

export function LoginForm({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [loginConfig, setLoginConfig] = useState<LoginConfig>(defaultConfig);
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

  // 获取登录页配置
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await fetch("/api/public/system/login-config");
        const result = await response.json();
        const data = result.data || result;
        setLoginConfig({
          siteName: data.siteName || defaultConfig.siteName,
          companyName: data.companyName || defaultConfig.companyName,
          logoUrl: data.logoUrl || defaultConfig.logoUrl,
          icp: data.login_icp || data.icp || "",
          policeIcp: data.login_police_icp || data.policeIcp || "",
          copyright:
            data.login_copyright || data.copyright || defaultConfig.copyright,
          websiteUrl: data.login_website_url || data.websiteUrl || "",
        });
      } catch (error) {
        console.log("[LoginForm] 获取配置失败，使用默认配置", error);
      }
    };
    fetchConfig();
  }, []);

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
      <div className={cn("w-full", className)}>
        {/* 主容器 - 玻璃拟态卡片 */}
        <div className="relative overflow-hidden rounded-2xl bg-white/80 backdrop-blur-xl shadow-2xl shadow-slate-900/10 dark:shadow-black/20 border border-slate-200/50 dark:border-slate-700/50">
          <div className="grid lg:grid-cols-2">
            {/* 左侧 - 登录表单 */}
            <div className="relative p-8 sm:p-12 lg:p-16">
              {/* 背景装饰 - 微妙的渐变 */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-blue-50/30 dark:from-slate-900/50 dark:to-blue-950/30 -z-10" />

              {/* Logo 区域 */}
              <div className="mb-8 flex items-center gap-3">
                {/* 使用企智通 Logo 图片 */}
                <img
                  src={loginConfig.logoUrl}
                  alt={loginConfig.siteName}
                  className="h-10 w-auto"
                />
                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {loginConfig.siteName}
                  </h1>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {loginConfig.companyName}
                  </p>
                </div>
              </div>

              {/* 标题区域 */}
              <div className="mb-10">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                  欢迎回来
                </h2>
                <p className="mt-3 text-slate-600 dark:text-slate-400">
                  登录您的账户以继续管理工作
                </p>
              </div>

              {/* 表单 */}
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FieldGroup className="space-y-5">
                    {/* 用户名输入框 */}
                    <div className="space-y-2">
                      <FieldLabel
                        htmlFor="username"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        用户名
                      </FieldLabel>
                      <FormField
                        control={form.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                id="username"
                                placeholder="输入您的用户名"
                                className={cn(
                                  "h-12 rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm",
                                  "placeholder:text-slate-400",
                                  "transition-all duration-200",
                                  "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
                                  "dark:border-slate-700 dark:bg-slate-800/50",
                                )}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* 密码输入框 */}
                    <div className="space-y-2">
                      <FieldLabel
                        htmlFor="password"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        密码
                      </FieldLabel>
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <PasswordInput
                                id="password"
                                placeholder="输入您的密码"
                                className={cn(
                                  "h-12 rounded-xl border-slate-200 bg-white/50 backdrop-blur-sm",
                                  "placeholder:text-slate-400",
                                  "transition-all duration-200",
                                  "focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10",
                                  "dark:border-slate-700 dark:bg-slate-800/50",
                                )}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </FieldGroup>

                  {/* 登录按钮 */}
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "h-12 w-full rounded-xl text-base font-semibold",
                      "bg-gradient-to-r from-blue-600 to-blue-500",
                      "shadow-lg shadow-blue-500/25",
                      "transition-all duration-200",
                      "hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02]",
                      "active:scale-[0.98]",
                      "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                    )}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        登录中...
                      </>
                    ) : (
                      <>
                        登录
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>
              </Form>

              {/* 备案信息 - Logo 下方 */}
              {(loginConfig.icp ||
                loginConfig.policeIcp ||
                loginConfig.websiteUrl) && (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
                  {loginConfig.websiteUrl && (
                    <a
                      href={loginConfig.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      <Globe className="mr-1 h-3 w-3" />
                      官网
                    </a>
                  )}
                  {loginConfig.icp && (
                    <a
                      href="https://beian.miit.gov.cn/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {loginConfig.icp}
                    </a>
                  )}
                  {loginConfig.policeIcp && (
                    <a
                      href={`http://www.beian.gov.cn/portal/registerSystemInfo?recordcode=${loginConfig.policeIcp.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                      {loginConfig.policeIcp}
                    </a>
                  )}
                </div>
              )}

              {/* 版权信息 */}
              {loginConfig.copyright && (
                <div className="mt-4 text-center text-xs text-slate-400">
                  {loginConfig.copyright}
                </div>
              )}
            </div>

            {/* 右侧 - 装饰区域 */}
            <div className="relative hidden lg:block overflow-hidden">
              {/* 渐变背景 */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800" />

              {/* 装饰图案 - 几何图形 */}
              <div className="absolute inset-0 opacity-20">
                {/* 大圆 */}
                <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full border border-white/20" />
                <div className="absolute -top-32 -right-32 h-[28rem] w-[28rem] rounded-full border border-white/10" />
                {/* 小圆 */}
                <div className="absolute bottom-20 right-20 h-48 w-48 rounded-full border border-white/10" />
                {/* 网格 */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                    backgroundSize: "40px 40px",
                  }}
                />
              </div>

              {/* 内容区域 */}
              <div className="relative z-10 flex h-full flex-col justify-between p-12 text-white">
                {/* 顶部内容 */}
                <div className="space-y-6">
                  {/* 安全徽章 */}
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm border border-white/10">
                    <ShieldCheck className="h-4 w-4 text-blue-200" />
                    <span className="text-sm font-medium text-blue-100">
                      企业级安全保护
                    </span>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold">
                      智能管理
                      <br />
                      高效协作
                    </h3>
                    <p className="max-w-xs text-blue-100/80 text-sm leading-relaxed">
                      全方位的企业管理解决方案，助力数字化转型
                    </p>
                  </div>
                </div>

                {/* 底部统计 */}
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-3xl font-bold">99.9%</p>
                    <p className="text-xs text-blue-200/70">系统可用性</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold">24/7</p>
                    <p className="text-xs text-blue-200/70">技术支持</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-3xl font-bold">SSL</p>
                    <p className="text-xs text-blue-200/70">数据加密</p>
                  </div>
                </div>
              </div>

              {/* 浮动装饰元素 */}
              <div className="absolute top-1/4 right-1/4 h-3 w-3 rounded-full bg-blue-300/40 animate-pulse" />
              <div className="absolute bottom-1/3 right-1/3 h-2 w-2 rounded-full bg-white/30 animate-pulse delay-75" />
            </div>
          </div>
        </div>
      </div>

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
