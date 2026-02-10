import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Shield, Copy, Check, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { useTwoFactorSetup } from "./hooks/use-two-factor-setup";
import { TotpVerifyInput } from "./components/totp-verify-input";
import { BackupCodesDisplay } from "./components/backup-codes-display";

export function Setup2faPage() {
  const {
    setupData,
    isLoading,
    backupCodes,
    step,
    setStep,
    verifyAndEnable,
    completeSetup,
  } = useTwoFactorSetup();

  const [copied, setCopied] = useState(false);
  const [verifyError, setVerifyError] = useState<string>();

  const handleCopySecret = async () => {
    if (setupData?.secret) {
      await navigator.clipboard.writeText(setupData.secret);
      setCopied(true);
      toast.success("密钥已复制到剪贴板");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerify = async (token: string) => {
    if (!setupData) return;

    setVerifyError(undefined);
    try {
      await verifyAndEnable(setupData.secret, token);
    } catch (error: any) {
      setVerifyError(error.message || "验证码无效，请重试");
    }
  };

  const handleComplete = () => {
    completeSetup();
  };

  if (isLoading && !setupData) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50/50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">正在加载双因素认证设置...</p>
        </div>
      </div>
    );
  }

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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            设置双因素认证
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {step === 1 && "为了保障您的账户安全，请完成双因素认证设置"}
            {step === 2 && "验证配置"}
            {step === 3 && "保存备份码"}
          </p>
        </div>

        {/* 进度指示器 */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i <= step ? "bg-primary w-8" : "bg-muted w-4"
              }`}
            />
          ))}
        </div>

        {/* 主卡片 */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              {step === 1 && "扫描二维码"}
              {step === 2 && "输入验证码"}
              {step === 3 && "保存备份码"}
            </CardTitle>
            <CardDescription>
              {step === 1 && "使用身份验证器应用扫描二维码"}
              {step === 2 && "输入应用中的 6 位验证码"}
              {step === 3 && "备份码用于恢复账户访问"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 1 && setupData && (
              <div className="space-y-4">
                <div className="flex justify-center py-4">
                  <div className="p-4 bg-white rounded-lg shadow-inner">
                    <QRCodeSVG value={setupData.qrCodeUrl} size={200} />
                  </div>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">无法扫描？</CardTitle>
                    <CardDescription className="text-xs">
                      手动输入密钥到身份验证器应用
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 p-2 bg-muted rounded text-sm font-mono tracking-wider break-all">
                        {setupData.secret}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopySecret}
                        disabled={copied}
                      >
                        {copied ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Button className="w-full" onClick={() => setStep(2)}>
                  下一步
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <TotpVerifyInput
                  onComplete={handleVerify}
                  isLoading={isLoading}
                  error={verifyError}
                />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setStep(1);
                    setVerifyError(undefined);
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回上一步
                </Button>
              </div>
            )}

            {step === 3 && (
              <BackupCodesDisplay
                codes={backupCodes}
                onConfirm={handleComplete}
              />
            )}
          </CardContent>
        </Card>

        {/* 提示信息 */}
        <p className="text-center text-sm text-muted-foreground mt-6">
          推荐使用 Google Authenticator、Authy 或 Microsoft Authenticator
        </p>
      </div>
    </div>
  );
}
